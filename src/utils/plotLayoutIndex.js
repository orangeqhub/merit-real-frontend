import plotNumberMapping from '../data/plotNumberMapping.json';

const PHASE1_MAX = 134;
const PHASE2_MIN = 135;
const LAYOUT_MAX = 272;
const PHASE2_OFFSET = 134;

export const LAYOUT_PLOT_TOTAL = Array.isArray(plotNumberMapping)
  ? plotNumberMapping.length
  : LAYOUT_MAX;

/** Same split as merit-map-layout/src/utils/plotPhases.ts */
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
      phase1.push(sorted[0]);
      phase2.push(sorted[sorted.length - 1]);
    } else if (sorted[0]) {
      singles.push(sorted[0]);
    }
  }

  const medX =
    phase1.length > 0
      ? [...phase1.map((p) => Number(p.center?.x) || 0)].sort((a, b) => a - b)[
          Math.floor(phase1.length / 2)
        ]
      : 0;

  for (const plot of singles) {
    const x = Number(plot.center?.x) || 0;
    if (x <= medX) phase1.push(plot);
    else phase2.push(plot);
  }

  return [
    ...phase1.map((p) => ({ ...p, phase: 1 })),
    ...phase2.map((p) => ({ ...p, phase: 2 })),
  ].map((plot) => ({
    ...plot,
    displayPlotNumber:
      plot.phase === 2 ? Number(plot.plotNumber) + PHASE2_OFFSET : Number(plot.plotNumber),
  }));
}

const PHASE_LOOKUP = (() => {
  const map = new Map();
  for (const plot of assignPlotPhases(plotNumberMapping)) {
    map.set(String(plot.id), {
      phase: plot.phase,
      displayPlotNo: String(plot.displayPlotNumber),
    });
  }
  return map;
})();

const PHASED_LAYOUT = assignPlotPhases(plotNumberMapping);

export const LAYOUT_PHASE_COUNTS = {
  all: PHASED_LAYOUT.length,
  phase1: PHASED_LAYOUT.filter((p) => p.displayPlotNumber >= 1 && p.displayPlotNumber <= PHASE1_MAX)
    .length,
  phase2: PHASED_LAYOUT.filter(
    (p) => p.displayPlotNumber >= PHASE2_MIN && p.displayPlotNumber <= LAYOUT_MAX
  ).length,
};

export function getPlotLayoutMeta(externalId) {
  if (externalId == null || externalId === '') return null;
  return PHASE_LOOKUP.get(String(externalId)) || null;
}

/** Public plot number range filter — independent of API phase column. */
export function plotNumberInViewPhase(plotNo, viewPhase) {
  const n = Number(String(plotNo ?? '').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n)) return false;
  if (viewPhase === 'all') return n >= 1 && n <= LAYOUT_MAX;
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
