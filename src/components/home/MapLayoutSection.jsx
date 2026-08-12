import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Expand, Map as MapIcon, RefreshCw, Upload } from 'lucide-react';
import {
  MAP_LAYOUT_URL,
  mapBookingService,
  PLOT_STATUS_COLORS,
  PLOT_STATUS_LABELS,
  PLOT_TYPE_COLORS,
  PLOT_TYPE_LABELS,
} from '../../services/mapBookingService';
import { parsePlotPricingSheet } from '../../utils/parsePlotPricingSheet';
import { notifyMapDataUpdated, onMapDataUpdated } from '../../utils/mapDataSync';
import { toSeriesPlotNo } from '../../utils/plotSeries';
import { savePendingBookPlot } from '../../utils/pendingBookPlot';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';

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

function statusRank(status) {
  const key = String(status || '').toLowerCase();
  if (key === 'sold') return 0;
  if (key === 'registered') return 1;
  if (key === 'booked') return 2;
  return 3;
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

function formatInr(value) {
  if (value == null || value === '' || Number(value) <= 0) return '—';
  return `₹${Number(value).toLocaleString('en-IN')}`;
}

function canBookAsCustomer(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (!['customer', 'buyer'].includes(role)) return false;
  if (user.status && user.status !== 'approved') return false;
  return true;
}

/** Phase 2 board uses public series 135–272; API may still store legacy 1–138. */
function normalizePlotForBoard(plot, boardPhase) {
  const phase = boardPhase ?? plot.phase ?? 1;
  return {
    ...plot,
    phase: Number(phase) === 2 ? 2 : 1,
    plotNo: toSeriesPlotNo(phase, plot.plotNo),
  };
}

/** One chip per plot number — keeps board UI, drops mapping duplicates. */
function dedupePlotsByNumber(items) {
  const byNo = Object.create(null);
  for (const item of items || []) {
    const key = plotNoKey(item.plotNo);
    if (!key) continue;
    const existing = byNo[key];
    if (!existing) {
      byNo[key] = item;
      continue;
    }
    const byStatus = statusRank(item.status) - statusRank(existing.status);
    if (byStatus < 0) {
      byNo[key] = item;
      continue;
    }
    if (byStatus > 0) continue;
    const aPriced = existing.plotCost != null && Number(existing.plotCost) > 0 ? 1 : 0;
    const bPriced = item.plotCost != null && Number(item.plotCost) > 0 ? 1 : 0;
    if (bPriced > aPriced) byNo[key] = item;
  }
  return Object.values(byNo).sort((a, b) => {
    const diff = plotNoNumeric(a.plotNo) - plotNoNumeric(b.plotNo);
    if (diff !== 0) return diff;
    return String(a.plotNo).localeCompare(String(b.plotNo));
  });
}

/**
 * Homepage / public map-layout section: live DXF layout embed + plot status board.
 */
export default function MapLayoutSection({ compact = true }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const fileInputRef = useRef(null);
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [viewerWarning, setViewerWarning] = useState('');
  const [phase, setPhase] = useState(1);
  const [boardSearch, setBoardSearch] = useState('');

  const canUpload = user && ['admin', 'sales_member'].includes(String(user.role || '').toLowerCase());

  async function loadPlots(nextPhase = phase) {
    setLoading(true);
    setLoadError('');
    try {
      const data = await mapBookingService.listPlots({
        pageSize: 500,
        unique: true,
        phase: nextPhase,
      });
      const items = dedupePlotsByNumber((data.items || []).map((p) => normalizePlotForBoard(p, nextPhase)));
      setPlots(items);
      if (!items.length) {
        setLoadError(`No Phase ${nextPhase} plots in API. Seed map plots or check backend.`);
      }
    } catch (err) {
      setPlots([]);
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

  function handlePhaseChange(nextPhase) {
    const value = nextPhase === 2 ? 2 : 1;
    setPhase(value);
    setSelected(null);
    setBoardSearch('');
    loadPlots(value);
    reloadViewer();
  }

  useEffect(() => {
    loadPlots(1);
  }, []);

  useEffect(() => {
    return onMapDataUpdated(() => {
      loadPlots(phase);
      reloadViewer();
    });
  }, [phase]);

  useEffect(() => {
    function onMessage(event) {
      const data = event?.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'merit-map-phase') {
        const next = Number(data.phase) === 2 ? 2 : 1;
        setPhase((current) => {
          if (current === next) return current;
          setSelected(null);
          setBoardSearch('');
          loadPlots(next);
          return next;
        });
        return;
      }

      if (data.type === 'merit-map-book') {
        const externalId = String(data.externalId || '').trim();
        const plotNo = String(data.plotNo || '').trim();
        const fromList =
          plots.find(
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
          setBoardSearch('');
          setSelected(null);
          return;
        }
        setBoardSearch(query);
        const match =
          plots.find((p) => plotNoKey(p.plotNo) === query) ||
          plots.find((p) => String(p.plotNo || '').startsWith(query)) ||
          null;
        if (match) setSelected(match);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [plots, user]);

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

  const counts = useMemo(() => statusCounts(plots), [plots]);
  const filteredPlots = useMemo(() => {
    const q = String(boardSearch || '').trim().toLowerCase();
    if (!q) return plots;
    return plots.filter((p) => {
      const no = String(p.plotNo || '').toLowerCase();
      const ext = String(p.externalId || '').toLowerCase();
      return no.includes(q) || ext.includes(q) || no.replace(/\s+/g, '') === q;
    });
  }, [plots, boardSearch]);
  const previewPlots = useMemo(
    () => filteredPlots.slice(0, compact ? 200 : 500),
    [filteredPlots, compact]
  );

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

  async function handleSheetUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!canUpload) {
      toast.info('Login as admin or sales to upload the pricing sheet.');
      navigate('/admin/login');
      return;
    }

    setUploading(true);
    try {
      const parsed = await parsePlotPricingSheet(file);
      const result = await mapBookingService.importSheet({
        phase,
        rows: parsed.rows,
      });
      const updated = Number(result?.updated || 0);
      const skipped = Number(result?.skipped || 0);
      toast.success(
        `Phase ${phase}: updated ${updated} plots` + (skipped ? `, skipped ${skipped}` : '')
      );
      if (result?.errors?.length) {
        toast.info(`First skip: plot ${result.errors[0].plotNo || '—'} — ${result.errors[0].reason}`);
      }
      notifyMapDataUpdated();
      await loadPlots(phase);
      reloadViewer();
    } catch (err) {
      toast.error(err.message || 'Unable to import sheet.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-brand-800 sm:text-2xl">Sky line Infra Anne Enclave</h2>
          <p className="mt-1 text-sm text-gray-500">
            Explore the interactive layout, check plot availability, and book your preferred plot.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              loadPlots();
              reloadViewer();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          {canUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleSheetUpload}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-800 hover:bg-brand-100 disabled:opacity-60"
              >
                <Upload size={14} />
                {uploading ? 'Uploading…' : `Upload Phase ${phase} sheet`}
              </button>
            </>
          )}
          <Link
            to="/map-layout"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-800"
          >
            <Expand size={14} /> Open full map
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex overflow-hidden rounded-full border border-gray-200 bg-white text-xs font-semibold">
          <button
            type="button"
            onClick={() => handlePhaseChange(1)}
            className={`px-3.5 py-1.5 transition ${
              phase === 1 ? 'bg-sky-500 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Phase 1
          </button>
          <button
            type="button"
            onClick={() => handlePhaseChange(2)}
            className={`px-3.5 py-1.5 transition ${
              phase === 2 ? 'bg-lime-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Phase 2
          </button>
        </div>
        {Object.entries(PLOT_STATUS_LABELS).map(([key, label]) => (
          <div
            key={key}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: PLOT_STATUS_COLORS[key] }}
            />
            {label}
            <span className="text-gray-400">({counts[key] || 0})</span>
          </div>
        ))}
      </div>

      <div className={`mt-5 grid gap-4 ${compact ? 'lg:grid-cols-[1.6fr_1fr]' : 'lg:grid-cols-[2fr_1fr]'}`}>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-[#111] shadow-sm">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs text-white/80">
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
          <iframe
            key={`${iframeKey}-phase-${phase}`}
            title="Sky line Infra Anne Enclave"
            src={`${MAP_LAYOUT_URL}/?embed=1&phase=${phase}`}
            className={`w-full border-0 ${compact ? 'h-[420px]' : 'h-[70vh] min-h-[560px]'}`}
            loading="eager"
            referrerPolicy="no-referrer"
            onLoad={() => setViewerWarning('')}
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-brand-900">
            Sky line Infra Anne Enclave · Phase {phase}
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            {loading
              ? 'Loading plots…'
              : plots.length
                ? `${plots.length} Phase ${phase} plots synced from booking system`
                : loadError || `No Phase ${phase} plots synced yet.`}
          </p>
          {!canUpload && (
            <p className="mt-1 text-[11px] text-gray-400">
              Admin/sales can upload the pricing Excel to fill area, facing, and cost.
            </p>
          )}

          {plots.length > 0 && (
            <div className="mt-3">
              <label htmlFor="board-plot-search" className="sr-only">
                Search plot number
              </label>
              <input
                id="board-plot-search"
                type="search"
                value={boardSearch}
                onChange={(e) => {
                  const value = e.target.value;
                  setBoardSearch(value);
                  const q = value.trim().replace(/\D/g, '');
                  if (!q) {
                    setSelected(null);
                    return;
                  }
                  const exact = plots.find((p) => plotNoKey(p.plotNo) === q);
                  const prefix = exact || plots.find((p) => String(p.plotNo || '').startsWith(q));
                  if (prefix) setSelected(prefix);
                }}
                placeholder="Search plot no…"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 outline-none ring-brand-500 placeholder:text-gray-400 focus:ring-2"
              />
              {boardSearch.trim() && (
                <p className="mt-1 text-[11px] text-gray-400">
                  Showing {filteredPlots.length} of {plots.length} plots
                </p>
              )}
            </div>
          )}

          {previewPlots.length > 0 ? (
            <div className="mt-3 grid max-h-[280px] grid-cols-5 gap-1.5 overflow-auto sm:grid-cols-6 md:grid-cols-8">
              {previewPlots.map((plot) => {
                const status = String(plot.status || 'available').toLowerCase();
                const color = chipColor(plot);
                const active = selected && (selected.id === plot.id || selected.externalId === plot.externalId || selected.plotNo === plot.plotNo);
                const typeLabel = PLOT_TYPE_LABELS[plot.plotType] || plot.plotType;
                return (
                  <button
                    key={`plot-${plot.phase || phase}-${plot.plotNo}-${plot.externalId || plot.id}`}
                    type="button"
                    title={`${plot.plotNo} · ${typeLabel || PLOT_STATUS_LABELS[status] || status}${plot.plotCost ? ` · ${formatInr(plot.plotCost)}` : ''}`}
                    onClick={() => setSelected(plot)}
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
            plots.length > 0 && boardSearch.trim() && (
              <p className="mt-3 text-xs text-gray-500">No plots match “{boardSearch.trim()}”.</p>
            )
          )}

          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-700">
            {selected ? (
              <div className="space-y-1.5">
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
                  {selected.plotArea ? `${Number(selected.plotArea).toLocaleString('en-IN')} Sq.Yds` : '—'}
                </p>
                <p><span className="text-gray-500">Facing:</span> {selected.facing || '—'}</p>
                <p>
                  <span className="text-gray-500">Rate:</span>{' '}
                  {selected.ratePerSqYd ? `${formatInr(selected.ratePerSqYd)} / Sq.Yd` : '—'}
                </p>
                <p><span className="text-gray-500">Total cost:</span> {formatInr(selected.plotCost)}</p>
                {isSaleable(selected) ? (
                  <button
                    type="button"
                    onClick={() => handleBook(selected)}
                    className="mt-2 w-full rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-800"
                  >
                    Book this plot
                  </button>
                ) : (
                  <p className="mt-2 text-[11px] text-amber-700">
                    This plot is not available for normal booking.
                  </p>
                )}
              </div>
            ) : (
              <p>Select a plot from the board{plots.length ? '' : ' once plots are synced'} to view details.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
