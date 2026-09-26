import type { PlotNumberEntry } from "../components/Layers/PlotNumberLayer";
import {
  getPhaseBoundaries,
  getPhaseDividerX,
  getPhotoSeriesEnabled,
} from "../layouts";

export type LayoutPhase = 1 | 2;
export type PhaseFilter = LayoutPhase | "all";

export type PhasedPlot = PlotNumberEntry & { phase: LayoutPhase };

type XY = { x: number; y: number };

function asRing(data: unknown): XY[] {
  if (!Array.isArray(data) || data.length === 0) return [];
  const first = data[0] as { x?: number } | XY[];
  if (first && typeof (first as { x?: number }).x === "number") {
    return data as XY[];
  }
  return ((data as XY[][])[0] || []) as XY[];
}

/** Phase-1 inner boundary for the active layout (empty when no phases). */
function phase1Ring(): XY[] {
  const boundaries = getPhaseBoundaries();
  if (!boundaries?.pink) return [];
  return asRing(boundaries.pink);
}

function phaseDivides(): boolean {
  return getPhotoSeriesEnabled() && getPhaseDividerX() != null;
}

const hasPhase1Boundary = (): boolean => {
  const boundaries = getPhaseBoundaries();
  return Boolean(boundaries?.pink && boundaries.pink.length > 0);
};

const phaseDividerX = (): number | null => getPhaseDividerX();

function pointInPolygon(x: number, y: number, ring: XY[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].x;
    const yi = ring[i].y;
    const xj = ring[j].x;
    const yj = ring[j].y;
    const hit =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function pointOf(
  value:
    | { x?: number; y?: number; centroid?: XY; center?: XY; polygon?: XY[] }
    | null
    | undefined
): XY | null {
  const c = value?.centroid || value?.center;
  if (c && Number.isFinite(c.x) && Number.isFinite(c.y)) return c;
  if (value && Number.isFinite(Number(value.x)) && Number.isFinite(Number(value.y))) {
    return { x: Number(value.x), y: Number(value.y) };
  }
  const poly = value?.polygon;
  if (poly && poly.length) {
    let x = 0;
    let y = 0;
    for (const p of poly) {
      x += Number(p.x) || 0;
      y += Number(p.y) || 0;
    }
    return { x: x / poly.length, y: y / poly.length };
  }
  return null;
}

/** True when the plot sits inside the inner pink Phase 1 border. */
export function isInsidePhase1Boundary(
  value:
    | { x?: number; y?: number; centroid?: XY; center?: XY; polygon?: XY[] }
    | null
    | undefined
): boolean {
  const p = pointOf(value);
  if (!p) return false;
  const ring = phase1Ring();
  if (ring.length === 0) return false;
  return pointInPolygon(p.x, p.y, ring);
}

/**
 * Plan-8 numbers (1–138) as printed on the PDF.
 * Twin copies: west = Phase 2, east = Phase 1 (used for series numbers).
 * Visible Phase 1 filter uses the inner pink boundary instead.
 */
export function assignPlotPhases(plots: PlotNumberEntry[]): PhasedPlot[] {
  const byNumber = new Map<number, PlotNumberEntry[]>();
  for (const plot of plots || []) {
    const num = Number(plot.plotNumber);
    if (!Number.isFinite(num) || num < 1) continue;
    const list = byNumber.get(num) || [];
    list.push(plot);
    byNumber.set(num, list);
  }

  const phase1: PlotNumberEntry[] = [];
  const phase2: PlotNumberEntry[] = [];
  const singles: PlotNumberEntry[] = [];

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

  for (const plot of singles) {
    const x = Number(plot.center?.x) || 0;
    // A plot with no twin belongs to the phase whose boundary it sits in.
    // The x-divider alone put Anne's four east-side singles (Plan-8 135-138,
    // outside the Phase 1 border) into Phase 1, so they claimed series
    // 135-138 -- already Phase 2's plots 1-4 -- and 269-272 went unused.
    const inPhase2 = hasPhase1Boundary()
      ? !isInsidePhase1Boundary(plot)
      : phaseDivides() && x < (phaseDividerX() ?? 0);
    if (inPhase2) phase2.push(plot);
    else phase1.push(plot);
  }

  const tagged: PhasedPlot[] = [
    ...phase1.map((p) => ({ ...p, phase: 1 as const })),
    ...phase2.map((p) => ({ ...p, phase: 2 as const })),
  ];

  return tagged.sort((a, b) => {
    if (a.phase !== b.phase) return a.phase - b.phase;
    return Number(a.plotNumber) - Number(b.plotNumber);
  });
}

export function filterPlotsByPhase(
  plots: PlotNumberEntry[],
  phase: PhaseFilter
): PhasedPlot[] {
  const phased = assignPlotPhases(plots);
  if (!hasPhase1Boundary()) {
    // Single-phase layouts ignore the phase filter entirely.
    return phased.map((p) => ({ ...p, phase: 1 as const }));
  }
  if (phase === "all") return phased;
  if (phase === 1) {
    return phased
      .filter((p) => isInsidePhase1Boundary(p))
      .map((p) => ({ ...p, phase: 1 as const }));
  }
  return phased
    .filter((p) => !isInsidePhase1Boundary(p))
    .map((p) => ({ ...p, phase: 2 as const }));
}

export function parsePhaseParam(
  value: unknown,
  fallback: PhaseFilter = "all"
): PhaseFilter {
  if (value == null || value === "" || value === "all") return "all";
  const n = Number(value);
  if (n === 2) return 2;
  if (n === 1) return 1;
  return fallback;
}

/** @deprecated use parsePhaseParam */
export function parsePhaseFromSearchParams(search: string): PhaseFilter {
  try {
    return parsePhaseParam(new URLSearchParams(search).get("phase"), "all");
  } catch {
    return "all";
  }
}

const PHASE1_MAX = 134;
const PHASE2_MIN = 135;
const LAYOUT_MAX = 272;

/** Public series number from geometry phase + internal mapping number. */
export function toDisplayPlotNumber(
  phase: LayoutPhase,
  internalPlotNumber: number | string
): number {
  const n = Number(internalPlotNumber);
  if (!Number.isFinite(n)) return Number.NaN;
  if (phase === 2) return n + 134;
  return n;
}

/** Filter by public plot number range (not array index). */
export function plotNumberInViewPhase(
  plotNumber: number | string,
  viewPhase: PhaseFilter
): boolean {
  const n = Number(String(plotNumber ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n)) return false;
  if (viewPhase === "all") return n >= 1 && n <= LAYOUT_MAX;
  if (viewPhase === 1) return n >= 1 && n <= PHASE1_MAX;
  return n >= PHASE2_MIN && n <= LAYOUT_MAX;
}

export function getLayoutPhaseCounts(plots: PlotNumberEntry[]) {
  const phased = assignPlotPhases(plots);
  if (!hasPhase1Boundary()) {
    return { all: phased.length, phase1: phased.length, phase2: 0 };
  }
  return {
    all: phased.length,
    phase1: phased.filter((p) => isInsidePhase1Boundary(p)).length,
    phase2: phased.filter((p) => !isInsidePhase1Boundary(p)).length,
  };
}
