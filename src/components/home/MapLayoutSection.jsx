import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, Map as MapIcon } from 'lucide-react';
import {
  MAP_LAYOUT_URL,
  mapBookingService,
  PLOT_STATUS_COLORS,
  PLOT_STATUS_LABELS,
  PLOT_TYPE_COLORS,
  PLOT_TYPE_LABELS,
} from '../../services/mapBookingService';
import { onMapDataUpdated } from '../../utils/mapDataSync';
import { toSeriesPlotNo } from '../../utils/plotSeries';
import { getPlotLayoutMeta, matchesBoardPlotSearch } from '../../utils/plotLayoutIndex';
import { savePendingBookPlot } from '../../utils/pendingBookPlot';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { formatInr, formatIndianNumber } from '../../utils/formatIndianNumber';
import SmartImage from '../common/SmartImage';
import { PROJECT_IMAGES } from '../../data/projectImages';

function statusCounts(plots) {
  return plots.reduce(
    (acc, p) => {
      const key = String(p.status || 'available').toLowerCase();
      if (acc[key] != null) acc[key] += 1;
      else acc.other += 1;
      return acc;
    },
    { available: 0, booked: 0, registered: 0, sold: 0, other: 0 }
  );
}

function plotNoKey(plotNo) {
  return String(plotNo ?? '').trim().toLowerCase();
}

function plotNoNumeric(plotNo) {
  const n = Number(String(plotNo ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

function chipColor(plot) {
  const type = String(plot.plotType || 'residential').toLowerCase();
  if (PLOT_TYPE_COLORS[type]) return PLOT_TYPE_COLORS[type];
  const status = String(plot.status || 'available').toLowerCase();
  return PLOT_STATUS_COLORS[status] || '#d1d5db';
}

function isSaleable(plot) {
  return String(plot.plotType || 'residential').toLowerCase() === 'residential'
    && String(plot.status || 'available').toLowerCase() === 'available';
}


function canBookAsCustomer(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (!['customer', 'buyer'].includes(role)) return false;
  if (user.status && user.status !== 'approved') return false;
  return true;
}

/** Normalize API row to public display plot number; never drops rows. */
function normalizePlotForBoard(plot) {
  const meta = getPlotLayoutMeta(plot.externalId || plot.id);
  if (meta) {
    const dNo = Number(meta.displayPlotNo);
    const displayNo = meta.assignedPhase === 2 && dNo > 134
      ? String(dNo - 134)
      : meta.displayPlotNo;
    return {
      ...plot,
      phase: meta.phase,
      plotNo: displayNo,
    };
  }

  const n = Number(String(plot.plotNo ?? '').replace(/[^\d.]/g, ''));
  const phaseNum = Number.isFinite(n) && n >= 135 ? 2 : 1;
  const displayNo = phaseNum === 2 && Number.isFinite(n)
    ? String(n - 134)
    : String(n || (plot.plotNo ?? ''));
  return {
    ...plot,
    phase: phaseNum,
    plotNo: displayNo,
  };
}

/** Dedupe by external id — master dataset keeps all unique API rows. */
function buildMasterPlotList(items) {
  const normalized = (items || []).map(normalizePlotForBoard).filter(Boolean);
  const byExternal = Object.create(null);
  for (const item of normalized) {
    const key = String(item.externalId || item.id || `${item.phase}-${item.plotNo}`);
    byExternal[key] = item;
  }
  return Object.values(byExternal).sort(
    (a, b) => plotNoNumeric(a.plotNo) - plotNoNumeric(b.plotNo)
  );
}

/**
 * Homepage / public map-layout section: live DXF layout embed + plot status board.
 */
export default function MapLayoutSection({ compact = true }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [allPlots, setAllPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [iframeKey, setIframeKey] = useState(0);
  const [viewerWarning, setViewerWarning] = useState('');
  const [phase1Open, setPhase1Open] = useState(false);
  const [phase2Open, setPhase2Open] = useState(false);
  const [phase1Search, setPhase1Search] = useState('');
  const [phase2Search, setPhase2Search] = useState('');
  const [selected1, setSelected1] = useState(null);
  const [selected2, setSelected2] = useState(null);

  function postPhaseToMap(nextPhase) {
    try {
      const frame = document.querySelector('iframe[title="Sky line Infra Anne Enclave"]');
      frame?.contentWindow?.postMessage({ type: 'merit-map-set-phase', phase: nextPhase }, '*');
    } catch {
      // ignore cross-origin
    }
  }

  function syncMapPhase(nextPhase = phase) {
    postPhaseToMap(nextPhase);
    window.setTimeout(() => postPhaseToMap(nextPhase), 150);
    window.setTimeout(() => postPhaseToMap(nextPhase), 600);
  }

  async function loadPlots() {
    setLoading(true);
    setLoadError('');
    try {
      const data = await mapBookingService.listPlots({ pageSize: 500 });
      const items = buildMasterPlotList(data.items || []);
      setAllPlots(items);
      if (!items.length) {
        setLoadError('No plots in API. Seed map plots or check backend.');
      }
    } catch (err) {
      setAllPlots([]);
      setLoadError(err.message || 'Unable to load plots from API.');
    } finally {
      setLoading(false);
    }
  }

  function reloadViewer() {
    setViewerWarning('');
    setIframeKey((k) => k + 1);
    // Ask iframe map to refetch plot info from API
    try {
      const frame = document.querySelector('iframe[title="Sky line Infra Anne Enclave"]');
      frame?.contentWindow?.postMessage({ type: 'merit-map-data-updated' }, '*');
    } catch {
      // ignore cross-origin
    }
  }

  function scrollToPlotBoard() {
    setPhase1Open(true);
    setPhase2Open(true);
    window.setTimeout(() => {
      document.getElementById('anne-enclave-phase1-board')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 60);
  }

  useEffect(() => {
    loadPlots('all');
  }, []);

  useEffect(() => {
    return onMapDataUpdated(() => {
      loadPlots();
      reloadViewer();
    });
  }, []);

  useEffect(() => {
    function onMessage(event) {
      const data = event?.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'merit-map-phase') {
        const next =
          data.phase === 2 || data.phase === '2'
            ? 2
            : data.phase === 1 || data.phase === '1'
              ? 1
              : 'all';
        if (next === 1 || next === '1') {
          setPhase1Open(true);
          syncMapPhase(1);
        } else if (next === 2 || next === '2') {
          setPhase2Open(true);
          syncMapPhase(2);
        }
        return;
      }

      if (data.type === 'merit-map-book') {
        const externalId = String(data.externalId || '').trim();
        const plotNo = String(data.plotNo || '').trim();
        const fromList =
          allPlots.find(
            (p) =>
              (externalId && (p.externalId === externalId || String(p.id) === externalId)) ||
              (plotNo && plotNoKey(p.plotNo) === plotNoKey(plotNo))
          ) || null;
        handleBook(
          fromList || {
            externalId: externalId || undefined,
            id: externalId || undefined,
            plotNo: plotNo || undefined,
            plotType: 'residential',
            status: 'available',
          }
        );
        return;
      }

      if (data.type === 'merit-map-search') {
        const query = String(data.query || '').replace(/\D/g, '');
        if (!query) {
          setPhase1Search('');
          setPhase2Search('');
          setSelected1(null);
          setSelected2(null);
          return;
        }
        setPhase1Search(query);
        setPhase2Search(query);
        const p1 = allPlots.filter((p) => p.phase === 1);
        const p2 = allPlots.filter((p) => p.phase === 2);
        const match1 = p1.find((p) => plotNoKey(p.plotNo) === query) || p1.find((p) => matchesBoardPlotSearch(p.plotNo, query)) || null;
        const match2 = p2.find((p) => plotNoKey(p.plotNo) === query) || p2.find((p) => matchesBoardPlotSearch(p.plotNo, query)) || null;
        if (match1) setSelected1(match1);
        if (match2) setSelected2(match2);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [allPlots, user]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetch(MAP_LAYOUT_URL, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' }).catch(() => {
        if (!cancelled) {
          setViewerWarning(`If the map is blank, start the map layout app on ${MAP_LAYOUT_URL}`);
        }
      });
    }, 2500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [iframeKey]);

  const counts = useMemo(() => statusCounts(allPlots), [allPlots]);

  const phase1Plots = useMemo(() => allPlots.filter((p) => p.phase === 1), [allPlots]);
  const phase2Plots = useMemo(() => allPlots.filter((p) => p.phase === 2), [allPlots]);

  const filteredPhase1 = useMemo(() => {
    const q = String(phase1Search || '').trim();
    if (!q) return phase1Plots;
    return phase1Plots.filter((p) => matchesBoardPlotSearch(p.plotNo, q));
  }, [phase1Plots, phase1Search]);

  const filteredPhase2 = useMemo(() => {
    const q = String(phase2Search || '').trim();
    if (!q) return phase2Plots;
    return phase2Plots.filter((p) => matchesBoardPlotSearch(p.plotNo, q));
  }, [phase2Plots, phase2Search]);

  function handleBook(plot) {
    if (!plot) return;
    if (!isSaleable(plot)) {
      toast.info('This plot is not available for booking.');
      return;
    }
    const externalId = plot.externalId || String(plot.id);
    const resumePath = `/book-plot/${encodeURIComponent(externalId)}`;

    if (!canBookAsCustomer(user)) {
      savePendingBookPlot(resumePath);
      toast.info('Please login or register as a customer to book a plot.');
      navigate('/login', { state: { from: resumePath, intent: 'book-plot' } });
      return;
    }

    navigate(resumePath);
  }

  return (
    <section className="mx-auto w-full max-w-screen-2xl px-3 py-6 sm:px-4 sm:py-8 md:px-6 md:py-10 lg:px-6">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="grid md:grid-cols-2 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="relative min-h-[200px] sm:min-h-[240px] md:min-h-full">
            <SmartImage
              src={PROJECT_IMAGES.anneEnclaveAerial}
              alt="Aerial view of the Sky Line Infra Anne Enclave plotted layout"
              className="absolute inset-0 h-full w-full object-cover object-center saturate-[1.08]"
              loading="eager"
            />
          </div>

          <div className="flex flex-col gap-3 p-3 sm:gap-4 sm:p-4 md:gap-5 md:p-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/60 bg-brand-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-700 sm:text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />
                Phase 1 &amp; Phase 2
              </span>
              <h2 className="mt-2 text-balance text-[clamp(1.75rem,3vw,3.5rem)] font-extrabold leading-tight tracking-tight text-brand-900">
                Sky line Infra Anne Enclave
              </h2>
            </div>

            <button
              type="button"
              onClick={scrollToPlotBoard}
              className="book-cta-btn group relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-2xl border border-gold-400/60 bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 px-5 py-4 text-left shadow-lg shadow-brand-900/25 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-900/35 sm:px-6 sm:py-5"
            >
              <span className="book-cta-shimmer pointer-events-none absolute inset-0" aria-hidden="true" />
              <span className="relative flex items-center gap-3 sm:gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-400/15 ring-1 ring-gold-400/40 sm:h-12 sm:w-12">
                  <MapIcon size={20} className="text-gold-400" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-gold-400 sm:text-xs">
                    Now booking &middot; Plots available
                  </span>
                  <span className="mt-1 block text-lg font-extrabold uppercase tracking-wide text-warm-white sm:text-2xl">
                    Book your plot now
                  </span>
                </span>
              </span>
              <ArrowRight
                size={22}
                className="relative shrink-0 text-gold-400 transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </button>

            <div className="mt-auto grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-brand-50/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">Project type</p>
                <p className="mt-0.5 truncate text-sm font-bold text-brand-900">Plotted layout</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-brand-50/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">Phases</p>
                <p className="mt-0.5 truncate text-sm font-bold text-brand-900">Phase 1 &amp; 2</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-brand-50/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">Plot type</p>
                <p className="mt-0.5 truncate text-sm font-bold text-brand-900">Residential</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-brand-50/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">Available now</p>
                <p className="mt-0.5 truncate text-sm font-bold text-brand-900">
                  {counts.available > 0 ? `${formatIndianNumber(counts.available)} plots` : 'Check board'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-[#111] shadow-sm">
          <div className="flex items-center justify-between border-b border-white/10 px-2.5 py-1.5 text-[11px] text-white/80 sm:px-3 sm:py-2 sm:text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <MapIcon size={14} /> Interactive layout
            </span>
            <a
              href={MAP_LAYOUT_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
            >
              Open in new tab
            </a>
          </div>
          {viewerWarning && (
            <div className="border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              {viewerWarning}{' '}
              <button type="button" onClick={reloadViewer} className="underline">
                Retry
              </button>
            </div>
          )}
          <div className="relative">
            <iframe
              key={iframeKey}
              title="Sky line Infra Anne Enclave"
              src={`${MAP_LAYOUT_URL}/?embed=1&v=phase2-remaining`}
              className={`w-full border-0 ${compact ? 'h-[40vh] min-h-[300px] sm:h-[50vh] sm:min-h-[400px] lg:h-[56vh] lg:min-h-[480px]' : 'h-[56vh] min-h-[400px] sm:h-[68vh] sm:min-h-[560px] lg:h-[78vh] lg:min-h-[640px]'}`}
              loading="eager"
              referrerPolicy="no-referrer"
              onLoad={() => {
                setViewerWarning('');
                syncMapPhase('all');
              }}
            />
            <div className="pointer-events-none absolute left-2 top-14 z-10 w-[120px] sm:left-5 sm:top-[82px] sm:w-[180px] lg:w-[220px]">
              <div className="flex flex-col gap-1.5 rounded-lg border border-white/15 bg-black/55 p-2 backdrop-blur-sm">
                {Object.entries(PLOT_STATUS_LABELS).map(([key, label]) => (
                  <div
                    key={key}
                    className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white/90 sm:gap-2 sm:px-2 sm:py-1 sm:text-[11px]"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/25"
                      style={{ backgroundColor: PLOT_STATUS_COLORS[key] }}
                    />
                    <span className="flex-1">{label}</span>
                    <span className="text-white/60">({counts[key] || 0})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <PlotBoard
          id="anne-enclave-phase1-board"
          title="Phase 1"
          plots={phase1Plots}
          filtered={filteredPhase1}
          search={phase1Search}
          onSearchChange={setPhase1Search}
          selected={selected1}
          onSelect={setSelected1}
          open={phase1Open}
          onToggle={() => setPhase1Open((v) => !v)}
          loading={loading}
          loadError={loadError}
          allPlots={allPlots}
          onBook={handleBook}
          accentColor="bg-sky-500"
        />

        <PlotBoard
          id="anne-enclave-phase2-board"
          title="Phase 2"
          plots={phase2Plots}
          filtered={filteredPhase2}
          search={phase2Search}
          onSearchChange={setPhase2Search}
          selected={selected2}
          onSelect={setSelected2}
          open={phase2Open}
          onToggle={() => setPhase2Open((v) => !v)}
          loading={loading}
          loadError={loadError}
          allPlots={allPlots}
          onBook={handleBook}
          accentColor="bg-lime-600"
        />
      </div>
    </section>
  );
}

function PlotBoard({ id, title, plots, filtered, search, onSearchChange, selected, onSelect, open, onToggle, loading, loadError, allPlots, onBook, accentColor }) {
  return (
    <div
      id={id}
      className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4"
    >
      <div className="flex items-center gap-2 sm:flex-wrap sm:items-end sm:justify-between sm:gap-3">
        <div
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 select-none"
          onClick={onToggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggle();
            }
          }}
        >
          <ChevronDown
            size={16}
            className={`mt-0.5 shrink-0 text-gray-400 transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
            aria-hidden
          />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-brand-900">
              {title} <span className={`ml-1 inline-block h-2 w-2 rounded-full ${accentColor}`} />
            </h3>
            <p className="mt-1 truncate text-xs text-gray-500">
              {loading
                ? 'Loading plots…'
                : plots.length
                  ? `${plots.length} of ${title === 'Phase 1' ? 134 : 138} plots synced from booking system`
                  : loadError || `No ${title} plots synced yet.`}
              {!open && plots.length > 0 && (
                <span className="text-gray-400"> · Tap to browse plots</span>
              )}
            </p>
          </div>
        </div>

        {plots.length > 0 && (
          <div className="w-32 shrink-0 sm:ml-auto sm:w-full sm:max-w-xs">
            <label htmlFor={`board-search-${id}`} className="sr-only">
              Search plot number
            </label>
            <input
              id={`board-search-${id}`}
              type="search"
              value={search}
              onChange={(e) => {
                const value = e.target.value;
                onSearchChange(value);
                const q = value.trim().replace(/\D/g, '');
                if (!q) {
                  onSelect(null);
                  return;
                }
                const exact = plots.find((p) => plotNoKey(p.plotNo) === q);
                const prefix = exact || plots.find((p) => matchesBoardPlotSearch(p.plotNo, q));
                if (prefix) onSelect(prefix);
              }}
              placeholder="Search plot no…"
              onFocus={onToggle}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 outline-none ring-brand-500 placeholder:text-gray-400 focus:ring-2"
            />
            {search.trim() && (
              <p className="mt-1 text-[11px] text-gray-400">
                Showing {filtered.length} of {plots.length} plots
              </p>
            )}
          </div>
        )}
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity,margin] duration-200 ease-out ${
          open ? 'mt-3 opacity-100' : 'mt-0 opacity-0'
        }`}
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          {filtered.length > 0 ? (
            <div className="grid max-h-[520px] grid-cols-5 gap-1 overflow-auto sm:grid-cols-8 sm:gap-1.5 md:grid-cols-10 lg:grid-cols-[repeat(14,minmax(0,1fr))] xl:grid-cols-[repeat(16,minmax(0,1fr))]">
              {filtered.map((plot) => {
                const status = String(plot.status || 'available').toLowerCase();
                const color = chipColor(plot);
                const active = selected && (selected.id === plot.id || selected.externalId === plot.externalId || selected.plotNo === plot.plotNo);
                const typeLabel = PLOT_TYPE_LABELS[plot.plotType] || plot.plotType;
                return (
                  <button
                    key={`plot-${plot.phase}-${plot.plotNo}-${plot.externalId || plot.id}`}
                    type="button"
                    title={`${plot.plotNo} · ${typeLabel || PLOT_STATUS_LABELS[status] || status}${plot.plotCost ? ` · ${formatInr(plot.plotCost)}` : ''}`}
                    onClick={() => onSelect(plot)}
                    className={`rounded-md px-1 py-2 text-center text-[11px] font-semibold leading-none tracking-tight text-gray-900 shadow-sm ring-offset-1 transition ${
                      active ? 'ring-2 ring-brand-600' : 'hover:brightness-95'
                    }`}
                    style={{
                      backgroundColor: color,
                      fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
                    }}
                  >
                    {plot.plotNo}
                  </button>
                );
              })}
            </div>
          ) : (
            plots.length > 0 && search.trim() && (
              <p className="text-xs text-gray-500">No plots match "{search.trim()}".</p>
            )
          )}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-2.5 text-xs text-gray-700 sm:mt-4 sm:p-3">
        {selected ? (
          <div className="grid gap-x-4 gap-y-1 sm:gap-x-6 sm:gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
            <p><span className="text-gray-500">Plot No:</span> <strong>{selected.plotNo}</strong></p>
            <p>
              <span className="text-gray-500">Type:</span>{' '}
              <strong>{PLOT_TYPE_LABELS[selected.plotType] || selected.plotType || 'Residential'}</strong>
            </p>
            <p>
              <span className="text-gray-500">Status:</span>{' '}
              <strong>{PLOT_STATUS_LABELS[selected.status] || selected.status}</strong>
            </p>
            <p>
              <span className="text-gray-500">Area:</span>{' '}
              {selected.plotArea ? `${formatIndianNumber(selected.plotArea)} Sq.Yds` : '—'}
            </p>
            <p><span className="text-gray-500">Facing:</span> {selected.facing || '—'}</p>
            <p>
              <span className="text-gray-500">Rate:</span>{' '}
              {selected.ratePerSqYd ? `${formatInr(selected.ratePerSqYd)} / Sq.Yd` : '—'}
            </p>
            <p><span className="text-gray-500">Total cost:</span> {formatInr(selected.plotCost)}</p>
            {isSaleable(selected) ? (
              <div className="sm:col-span-2 lg:col-span-3">
                <button
                  type="button"
                  onClick={() => onBook(selected)}
                  className="mt-2 w-full max-w-xs rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-800"
                >
                  Book this plot
                </button>
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-amber-700 sm:col-span-2 lg:col-span-3">
                This plot is not available for normal booking.
              </p>
            )}
          </div>
        ) : (
          <p>Select a plot from the board{allPlots.length ? '' : ' once plots are synced'} to view details.</p>
        )}
      </div>
    </div>
  );
}
