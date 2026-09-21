import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, Map as MapIcon } from 'lucide-react';
import {
  mapBookingService,
  PLOT_STATUS_COLORS,
  PLOT_STATUS_LABELS,
  PLOT_TYPE_COLORS,
  PLOT_TYPE_LABELS,
} from '../../services/mapBookingService';
import { getMapLayoutByKey, mapLayoutIframeUrl } from '../../config/mapLayouts';
import { onMapDataUpdated } from '../../utils/mapDataSync';
import { getPlotLayoutMeta, matchesBoardPlotSearch } from '../../utils/plotLayoutIndex';
import { savePendingBookPlot } from '../../utils/pendingBookPlot';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { formatInr, formatIndianNumber } from '../../utils/formatIndianNumber';
import SmartImage from '../common/SmartImage';
import { PROJECT_IMAGES } from '../../data/projectImages';

/** A merged board tile like "67&68" is one tile but two real plot numbers,
 * so it must count as 2 units everywhere a total is tallied. */
function plotUnitWeight(plotNo) {
  return String(plotNo || '').includes('&') ? 2 : 1;
}

function statusCounts(plots) {
  return plots.reduce(
    (acc, p) => {
      const key = String(p.status || 'available').toLowerCase();
      const weight = plotUnitWeight(p.plotNo);
      if (acc[key] != null) acc[key] += weight;
      else acc.other += weight;
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
function normalizePlotForBoard(plot, forceSinglePhase = false) {
  if (!forceSinglePhase) {
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
  }

  const n = Number(String(plot.plotNo ?? '').replace(/[^\d.]/g, ''));
  const phaseNum = forceSinglePhase
    ? (Number(plot.phase) === 2 ? 2 : 1)
    : (Number.isFinite(n) && n >= 135 ? 2 : 1);
  const displayNo = phaseNum === 2 && Number.isFinite(n)
    ? String(n - 134)
    : String(n || (plot.plotNo ?? ''));
  return {
    ...plot,
    phase: phaseNum,
    plotNo: displayNo,
  };
}

/** Dedupe by external id �?" master dataset keeps all unique API rows. */
function buildMasterPlotList(items, forceSinglePhase = false) {
  const normalized = (items || [])
    .map((plot) => normalizePlotForBoard(plot, forceSinglePhase))
    .filter(Boolean);
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
export default function MapLayoutSection({ compact = true, layoutKey = 'anne-enclave' }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const layout = getMapLayoutByKey(layoutKey);
  const hasPhase2 = layout.phases === 2;
  const [syncedPlots, setSyncedPlots] = useState([]);
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
  // Verified unique plot count + plot-number list reported live by the
  // embedded map app itself (computed from its own actual plot geometry,
  // not the booking-sync list) — reset on every layout switch so stale
  // data from the previous layout is never shown while the new iframe
  // loads.
  const [verifiedPlotCount, setVerifiedPlotCount] = useState(null);
  const [verifiedPlotNumbers, setVerifiedPlotNumbers] = useState(null);

  useEffect(() => {
    setVerifiedPlotCount(null);
    setVerifiedPlotNumbers(null);
    // Switching layouts must reset the previous layout's selection -- a
    // plot number/status/selection left over from a different layout's own
    // (unrelated) plot data must never leak into the newly-mounted board.
    setSelected1(null);
    setSelected2(null);
    setPhase1Search('');
    setPhase2Search('');
    setPhase1Open(false);
    setPhase2Open(false);
  }, [layout.key]);

  // The embedded map's plot-number list (Sri Lakshmi / Dokiparru / …) is the
  // authoritative board set, but each tile is ALSO matched against the
  // backend row of the CURRENT layout (by plotted number) so the tile keeps
  // the real externalId / area / cost instead of a bare plot number. Without
  // this, "Book this plot" from a synthetic tile would submit a numeric
  // externalId like "5" that the backend resolves to a DIFFERENT layout's row
  // (its numeric PK), leaking plot data across layouts. Anne Enclave never
  // sends this message, so `verifiedPlotNumbers` stays null there and this
  // falls straight through to the existing booking-synced list, unchanged.
  const syncedByPlotNo = useMemo(() => {
    const index = Object.create(null);
    for (const plot of syncedPlots) {
      const key = plotNoKey(plot.plotNo);
      if (key && !index[key]) index[key] = plot;
    }
    return index;
  }, [syncedPlots]);

  const allPlots = useMemo(() => {
    if (verifiedPlotNumbers && verifiedPlotNumbers.length) {
      return verifiedPlotNumbers
        .map((n) => {
          const synced = syncedByPlotNo[String(n).trim().toLowerCase()] || null;
          return synced
            ? {
                ...synced,
                // Keep the map-posted plot number as the displayed one; the
                // board row is the real backend plot (real externalId/area/
                // cost/status), so board selections and bookings anchor to the
                // correct MapPlots row of THIS layout.
                plotNo: String(n),
                phase: 1,
                synthetic: false,
              }
            : {
                id: String(n),
                externalId: String(n),
                plotNo: String(n),
                phase: 1,
                status: 'available',
                plotType: 'residential',
                plotArea: null,
                facing: null,
                plotCost: null,
                ratePerSqYd: null,
                synthetic: true,
              };
        })
        .sort((a, b) => plotNoNumeric(a.plotNo) - plotNoNumeric(b.plotNo));
    }
    return syncedPlots;
  }, [verifiedPlotNumbers, syncedPlots, syncedByPlotNo]);

  function postPhaseToMap(nextPhase) {
    try {
      const frame = document.querySelector(`iframe[data-layout-key="${layout.key}"]`);
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

  // Board -> map highlight sync. `fromMap` guards against the loop that
  // would otherwise fire when a `merit-map-select` message (map click)
  // triggers this same select handler -- in that case the embedded map
  // already knows what's selected, so there's nothing to post back.
  function postSelectToMap(plot, { fromMap = false } = {}) {
    if (fromMap) return;
    try {
      const frame = document.querySelector(`iframe[data-layout-key="${layout.key}"]`);
      frame?.contentWindow?.postMessage(
        {
          type: 'merit-map-select-plot',
          plotNo: plot ? String(plot.plotNo) : null,
          externalId: plot ? String(plot.externalId || plot.id || '') : null,
        },
        '*'
      );
    } catch {
      // ignore cross-origin
    }
  }

  // Map -> Board -> Details: when a selection originates in the embedded map
  // (a plot click there, or the map app's own search box), the board holding
  // that plot must OPEN and scroll into view so the details panel at its foot
  // is actually visible. Board-originated selections skip the scroll -- the
  // user is already on the board there and only the map highlight is pushed
  // (Board -> Map -> Details).
  function revealPlotBoard(phase) {
    if (phase === 2) setPhase2Open(true);
    else setPhase1Open(true);
    const boardId = hasPhase2
      ? phase === 2
        ? `${layout.key}-phase2-board`
        : `${layout.key}-phase1-board`
      : `${layout.key}-all-board`;
    window.setTimeout(() => {
      document
        .getElementById(boardId)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  // ONE shared selection flow reused by every layout and every entry point
  // (map click, map search, board tile click, board search). It always:
  //   1. selects the plot in the right board (selected1/selected2),
  //   2. opens + scrolls to the board when the click came FROM the map, so
  //      the details panel at the board's foot becomes visible, and
  //   3. pushes the selection to the embedded map (unless it already came
  //      from there) so the map zooms/highlights the same plot.
  // There is deliberately no per-layout variant of this flow.
  function selectPlot(plot, phaseHint, opts = {}) {
    const is2 = phaseHint === 2 || (phaseHint == null && plot?.phase === 2);
    if (is2) {
      setSelected2(plot);
    } else {
      setSelected1(plot);
    }
    if (plot && opts.fromMap) {
      revealPlotBoard(plot.phase ?? (is2 ? 2 : 1));
    }
    postSelectToMap(plot, opts);
  }

  async function loadPlots() {
    setLoading(true);
    setLoadError('');
    try {
      const data = await mapBookingService.listPlots({ pageSize: 500, layout: layout.key });
      const items = buildMasterPlotList(data.items || [], !hasPhase2);
      setSyncedPlots(items);
      if (!items.length) {
        setLoadError('No plots in API. Seed map plots or check backend.');
      }
    } catch (err) {
      setSyncedPlots([]);
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
      const frame = document.querySelector(`iframe[data-layout-key="${layout.key}"]`);
      frame?.contentWindow?.postMessage({ type: 'merit-map-data-updated' }, '*');
    } catch {
      // ignore cross-origin
    }
  }

  function scrollToPlotBoard() {
    setPhase1Open(true);
    setPhase2Open(true);
    window.setTimeout(() => {
      document.getElementById(hasPhase2 ? `${layout.key}-phase1-board` : `${layout.key}-all-board`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 60);
  }

  useEffect(() => {
    loadPlots();
  }, [layout.key]);

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

      // Data isolation across layouts: only accept messages from the iframe
      // of the layout currently shown. A stale/closed iframe from a
      // previously selected layout must never be able to push its own plot
      // selection/book/search into the newly-mounted board.
      try {
        const frame = document.querySelector(`iframe[data-layout-key="${layout.key}"]`);
        if (frame && event.source && event.source !== frame.contentWindow) return;
      } catch {
        // ignore cross-origin access errors
      }

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

      if (data.type === 'merit-map-plot-count') {
        const count = Number(data.count);
        if (Number.isFinite(count) && count >= 0) setVerifiedPlotCount(count);
        if (Array.isArray(data.plotNumbers) && data.plotNumbers.length) {
          // Keep as strings (not Number(...)) -- a merged board tile like
          // "67&68" is not a finite number and must survive as its own
          // single tile, matching how the source map itself renders it.
          setVerifiedPlotNumbers(data.plotNumbers.map((n) => String(n).trim()).filter(Boolean));
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
        // The map iframe's own externalId is authoritative -- it matches the
        // real backend MapPlots row for layouts (Manjunadha/Sri Lakshmi/
        // Dokiparru) whose board list is a synthetic "verified plot number"
        // list (plotNo used as a stand-in id, e.g. "22"). Without this
        // override, a synthetic-list match would silently substitute that
        // bare plot number as the booking externalId instead of the real
        // one, sending the booking flow to a plot that doesn't exist in the
        // backend.
        handleBook(
          fromList
            ? { ...fromList, externalId: externalId || fromList.externalId }
            : {
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
        // fromMap: true -- the map's own search already selected/zoomed to
        // this plot there, so posting a select-plot message back would be
        // redundant (and update-order between the two would be racy).
        if (match1) selectPlot(match1, 1, { fromMap: true });
        if (match2) selectPlot(match2, 2, { fromMap: true });
        return;
      }

      // User clicked a plot directly on the embedded map (not search, not
      // book) -- highlight the same plot in the board + show its details,
      // without re-posting a select message back to the map that already
      // knows what it just selected.
      if (data.type === 'merit-map-select') {
        const externalId = String(data.externalId || '').trim();
        const plotNo = String(data.plotNo || '').trim();
        if (!externalId && !plotNo) return;
        const match =
          allPlots.find(
            (p) =>
              (externalId && (p.externalId === externalId || String(p.id) === externalId)) ||
              (plotNo && plotNoKey(p.plotNo) === plotNoKey(plotNo))
          ) || null;
        if (match) {
          selectPlot(match, match.phase, { fromMap: true });
        }
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [allPlots, user, layout.key]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetch(mapLayoutIframeUrl(layout.key), { method: 'HEAD', mode: 'no-cors', cache: 'no-store' }).catch(() => {
        if (!cancelled) {
          setViewerWarning(
            `If the map is blank, start the map layout app on ${mapLayoutIframeUrl(layout.key)}`
          );
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
    const resumePath = `/book-plot/${encodeURIComponent(externalId)}?layout=${encodeURIComponent(layout.key)}`;

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
              src={layout.image || PROJECT_IMAGES.anneEnclaveAerial}
              alt={layout.imageAlt || layout.title}
              className="absolute inset-0 h-full w-full object-cover object-center saturate-[1.08]"
              loading="eager"
            />
          </div>

          <div className="flex flex-col gap-3 p-3 sm:gap-4 sm:p-4 md:gap-5 md:p-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/60 bg-brand-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-700 sm:text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />
                {layout.phasesLabel}
              </span>
              <h2 className="mt-2 text-balance text-[clamp(1.75rem,3vw,3.5rem)] font-extrabold leading-tight tracking-tight text-brand-900">
                {layout.title}
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
                    {counts.available > 0 ? 'Now booking · Plots available' : 'Interactive layout'}
                  </span>
                  <span className="mt-1 block text-lg font-extrabold uppercase tracking-wide text-warm-white sm:text-2xl">
                    {counts.available > 0 ? 'Book your plot now' : 'Browse the layout'}
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
                <p className="mt-0.5 truncate text-sm font-bold text-brand-900">{layout.phasesLabel}</p>
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
              href={mapLayoutIframeUrl(layout.key)}
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
              key={`${layout.key}-${iframeKey}`}
              title={layout.title}
              data-layout-key={layout.key}
              src={mapLayoutIframeUrl(layout.key)}
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

        {hasPhase2 ? (
          <>
            <PlotBoard
              id={`${layout.key}-phase1-board`}
              title="Phase 1"
              plots={phase1Plots}
              filtered={filteredPhase1}
              search={phase1Search}
              onSearchChange={setPhase1Search}
              selected={selected1}
              onSelect={(plot) => selectPlot(plot, 1)}
              open={phase1Open}
              onToggle={() => setPhase1Open((v) => !v)}
              loading={loading}
              loadError={loadError}
              allPlots={allPlots}
              onBook={handleBook}
              expected={layout.phase1Total}
              accentColor="bg-sky-500"
            />
            <PlotBoard
              id={`${layout.key}-phase2-board`}
              title="Phase 2"
              plots={phase2Plots}
              filtered={filteredPhase2}
              search={phase2Search}
              onSearchChange={setPhase2Search}
              selected={selected2}
              onSelect={(plot) => selectPlot(plot, 2)}
              open={phase2Open}
              onToggle={() => setPhase2Open((v) => !v)}
              loading={loading}
              loadError={loadError}
              allPlots={allPlots}
              onBook={handleBook}
              expected={layout.phase2Total}
              accentColor="bg-lime-600"
            />
          </>
        ) : (
          <PlotBoard
            id={`${layout.key}-all-board`}
            title={verifiedPlotCount != null ? `All plots (${verifiedPlotCount})` : 'All plots'}
            plots={allPlots}
            filtered={filteredPhase1}
            search={phase1Search}
            onSearchChange={setPhase1Search}
            selected={selected1}
            onSelect={(plot) => selectPlot(plot, 1)}
            open={phase1Open}
            onToggle={() => setPhase1Open((v) => !v)}
            loading={loading}
            loadError={loadError}
            allPlots={allPlots}
            onBook={handleBook}
            accentColor="bg-gold-400"
            verifiedCount={verifiedPlotCount}
          />
        )}
      </div>
    </section>
  );
}

function PlotBoard({ id, title, plots, filtered, search, onSearchChange, selected, onSelect, open, onToggle, loading, loadError, allPlots, onBook, expected, accentColor, verifiedCount }) {
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
              {loading && verifiedCount == null
                ? 'Loading plots…'
                : verifiedCount != null
                  // Same exact, verified per-layout plot count everywhere it
                  // appears on this board (title + subtitle), rather than a
                  // second, smaller booking-sync number that would
                  // contradict the title right above it.
                  ? `${verifiedCount} plots`
                  : plots.length
                    ? expected
                      ? `${plots.length} of ${expected} plots synced from booking system`
                      : `${plots.length} plots synced from booking system`
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
            {selected.customerName ? (
              <p>
                <span className="text-gray-500">Customer:</span>{' '}
                <strong>{selected.customerName}</strong>
              </p>
            ) : null}
            <p>
              <span className="text-gray-500">Rate:</span>{' '}
              {selected.ratePerSqYd ? `${formatInr(selected.ratePerSqYd)} / Sq.Yd` : '—'}
            </p>
            <p><span className="text-gray-500">Total cost:</span> {selected.plotCost ? formatInr(selected.plotCost) : '—'}</p>
            {selected.synthetic ? (
              <p className="mt-2 text-[11px] text-gray-500 sm:col-span-2 lg:col-span-3">
                Contact us to enquire about this plot.
              </p>
            ) : isSaleable(selected) ? (
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
