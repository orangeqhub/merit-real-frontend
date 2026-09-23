import type { LayoutPhase, PhaseFilter } from "./plotPhases";

const PHASE1_MAX = 134;
const PHASE2_OFFSET = 134;
const PHASE2_SERIES_MIN = 135;
const PHASE2_SERIES_MAX = 272;
const PHASE2_INTERNAL_MAX = 138;

function parsePlotNumber(value: unknown): number | null {
  const n = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Public brochure plot number.
 * Mapping/DXF internal numbers for Phase 2 are always 1–138 (+134 → 135–272).
 * API/UI values may already be in series form (135–272).
 */
export function toSeriesPlotNo(
  phase: LayoutPhase | number,
  plotNumber: number | string
): string {
  const phaseNum = Number(phase) === 2 ? 2 : 1;
  const n = parsePlotNumber(plotNumber);
  if (n == null) return String(plotNumber ?? "").trim();
  if (phaseNum === 2) {
    if (n >= 1 && n <= PHASE2_INTERNAL_MAX) return String(n + PHASE2_OFFSET);
    if (n >= PHASE2_SERIES_MIN && n <= PHASE2_SERIES_MAX) return String(n);
  }
  if (n >= 1 && n <= PHASE1_MAX) return String(n);
  return String(n);
}

export function toSeriesPlotNumber(
  phase: LayoutPhase | number,
  plotNumber: number | string
): number {
  return Number(toSeriesPlotNo(phase, plotNumber));
}

export function seriesPlotNoCandidates(
  phase: PhaseFilter | number,
  plotNumber: number | string
): string[] {
  const raw = String(plotNumber ?? "").trim();
  const n = parsePlotNumber(raw);

  if (phase === "all") {
    if (n == null) return raw ? [raw] : [];
    return [...new Set([raw, String(n)])];
  }

  const series = toSeriesPlotNo(phase, raw);
  if (Number(phase) === 2) {
    const internal =
      n != null && n >= PHASE2_SERIES_MIN && n <= PHASE2_SERIES_MAX
        ? String(n - PHASE2_OFFSET)
        : n != null && n >= 1 && n <= PHASE2_INTERNAL_MAX
          ? String(n)
          : raw;
    return [...new Set([raw, series, internal].filter(Boolean))];
  }
  return [...new Set([raw, series].filter(Boolean))];
}
