/** Phase 1: 1–134. Phase 2: 135–272 (internal east-side copies are 1–138). */
const PHASE1_MAX = 134;
const PHASE2_OFFSET = 134;
const PHASE2_SERIES_MIN = 135;
const PHASE2_SERIES_MAX = 272;
const PHASE2_INTERNAL_MAX = 138;

function parsePlotNumber(value) {
  const n = Number(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function toSeriesPlotNo(phase, plotNo) {
  const phaseNum = Number(phase) === 2 ? 2 : 1;
  const n = parsePlotNumber(plotNo);
  if (n == null) return String(plotNo ?? '').trim();
  if (phaseNum === 2) {
    if (n >= 1 && n <= PHASE2_INTERNAL_MAX) return String(n + PHASE2_OFFSET);
    if (n >= PHASE2_SERIES_MIN && n <= PHASE2_SERIES_MAX) return String(n);
  }
  if (n >= 1 && n <= PHASE1_MAX) return String(n);
  return String(n);
}

export function plotNoNumeric(plotNo) {
  const n = parsePlotNumber(plotNo);
  return n == null ? Number.POSITIVE_INFINITY : n;
}

export function plotNoKey(plotNo) {
  return String(plotNo ?? '').trim().toLowerCase();
}
