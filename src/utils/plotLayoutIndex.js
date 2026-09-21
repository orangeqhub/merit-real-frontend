import plotNumberMapping from '../data/plotNumberMapping.json';

const PHASE1_MAX = 134;
const PHASE2_MIN = 135;
const LAYOUT_MAX = 272;
const PHASE2_OFFSET = 134;
const PHASE1_RING = [
  { x: 37484.39473728792, y: 3466.49455699673 },
  { x: 37511.79812686109, y: 12357.23199602808 },
  { x: 36671.43938627921, y: 12348.09727472842 },
  { x: 36068.57565623043, y: 12345.05262573713 },
  { x: 33988.99521934368, y: 12326.78395746362 },
  { x: 33988.99521934368, y: 12616.03722652285 },
  { x: 33845.8905221468, y: 12616.03722652285 },
  { x: 30520.99831664682, y: 12582.54531329288 },
  { x: 30530.13303794647, y: 11955.32206833644 },
  { x: 29653.23850946912, y: 11930.96332775456 },
  { x: 29653.23850946912, y: 3901.897172244116 },
  { x: 32137.77274871302, y: 3207.689326501958 },
  { x: 37484.39473728792, y: 3466.49455699673 },
];

export const LAYOUT_PLOT_TOTAL = Array.isArray(plotNumberMapping)
  ? plotNumberMapping.length
  : LAYOUT_MAX;

function pointInPolygon(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].x;
    const yi = ring[i].y;
    const xj = ring[j].x;
    const yj = ring[j].y;
    const hit = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function isInsidePhase1Boundary(plot) {
  const p = plot?.centroid || plot?.center;
  const x = Number(p?.x);
  const y = Number(p?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  return pointInPolygon(x, y, PHASE1_RING);
}

/** Twin copies: west = Phase 2 series, east = Phase 1 series. */
function assignPlotPhases(plots) {
  const byNumber = new Map();
  for (const plot of plots || []) {
    const num = Number(plot.plotNumber);
    if (!Number.isFinite(num) || num < 1) continue;
    const list = byNumber.get(num) || [];
    list.push(plot);
    byNumber.set(num, list);
  }

  const phase1 = [];
  const phase2 = [];
  const singles = [];

  for (const list of byNumber.values()) {
    const sorted = [...list].sort((a, b) => {
      const dx = Number(a.center?.x) - Number(b.center?.x);
      if (dx !== 0) return dx;
      return Number(a.center?.y) - Number(b.center?.y);
    });
    if (sorted.length >= 2) {
      phase2.push(sorted[0]);
      phase1.push(sorted[sorted.length - 1]);
    } else if (sorted[0]) {
      singles.push(sorted[0]);
    }
  }

  const PHASE_DIVIDER_X = 29653.23850946912;

  for (const plot of singles) {
    const x = Number(plot.center?.x) || 0;
    if (x < PHASE_DIVIDER_X) phase2.push(plot);
    else phase1.push(plot);
  }

  return [
    ...phase1.map((p) => ({ ...p, phase: 1 })),
    ...phase2.map((p) => ({ ...p, phase: 2 })),
  ].map((plot) => ({
    ...plot,
    displayPlotNumber:
      plot.phase === 2 ? Number(plot.plotNumber) + PHASE2_OFFSET : Number(plot.plotNumber),
    viewPhase: isInsidePhase1Boundary(plot) ? 1 : 2,
  }));
}

const PHASE_LOOKUP = (() => {
  const map = new Map();
  for (const plot of assignPlotPhases(plotNumberMapping)) {
    map.set(String(plot.id), {
      phase: plot.viewPhase,
      assignedPhase: plot.phase,
      displayPlotNo: String(plot.displayPlotNumber),
    });
  }
  return map;
})();

const PHASED_LAYOUT = assignPlotPhases(plotNumberMapping);

export const LAYOUT_PHASE_COUNTS = {
  all: PHASED_LAYOUT.length,
  phase1: PHASED_LAYOUT.filter((p) => p.viewPhase === 1).length,
  phase2: PHASED_LAYOUT.filter((p) => p.viewPhase === 2).length,
};

export function getPlotLayoutMeta(externalId) {
  if (externalId == null || externalId === '') return null;
  return PHASE_LOOKUP.get(String(externalId)) || null;
}

/** Filter the plot board by layout phase (pink box = 1). */
export function plotNumberInViewPhase(plotNo, viewPhase, plotPhase) {
  if (viewPhase === 'all') return true;
  if (plotPhase === 1 || plotPhase === 2 || plotPhase === '1' || plotPhase === '2') {
    if (Number(viewPhase) === 1) return Number(plotPhase) === 1;
    return Number(plotPhase) === Number(viewPhase);
  }
  const n = Number(String(plotNo ?? '').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n)) return false;
  if (viewPhase === 1) return n >= 1 && n <= PHASE1_MAX;
  if (viewPhase === 2) return n >= PHASE2_MIN && n <= LAYOUT_MAX;
  return true;
}

export function matchesBoardPlotSearch(plotNo, rawQuery) {
  const q = String(rawQuery || '').trim().replace(/\D/g, '');
  if (!q) return true;
  const no = String(plotNo || '').replace(/\D/g, '');
  if (no === q) return true;
  if (q.length >= 2 && no.startsWith(q)) return true;
  return false;
}

if (import.meta.env?.DEV) {
  const { all, phase1, phase2 } = LAYOUT_PHASE_COUNTS;
  if (all !== 272 || phase1 !== 134 || phase2 !== 138) {
    console.warn('[plotLayoutIndex] unexpected layout counts', LAYOUT_PHASE_COUNTS);
  }
}
