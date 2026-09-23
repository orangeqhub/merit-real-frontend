import { Point } from "../types/dxf";
import { getRegionData, getActiveLayoutKey } from "../layouts";

export const REGION_BUFFER = 60;
export const FILL_PLOT_OPEN = "#2E7D32";
export const FILL_PLOT_UTILITY = "#9C27B0";

interface RegionPolygon {
  polygon: Point[];
  area: number;
}

interface LabeledRegion extends RegionPolygon {
  text: string;
  textPos: Point;
}

interface RegionData {
  openSpaces: LabeledRegion[];
  utilities: LabeledRegion[];
  plots: RegionPolygon[];
}

const dataOf = (): { openSpaces: LabeledRegion[]; utilities: LabeledRegion[]; plots: RegionPolygon[] } =>
  getRegionData() as unknown as {
    openSpaces: LabeledRegion[];
    utilities: LabeledRegion[];
    plots: RegionPolygon[];
  };

export type PlotRegionClass = "open" | "utility";

function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  let t = lengthSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const qx = a.x + t * dx;
  const qy = a.y + t * dy;
  return Math.hypot(p.x - qx, p.y - qy);
}

function pointToPolygonDistance(p: Point, polygon: Point[]): number {
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < polygon.length; i++) {
    const d = pointToSegmentDistance(p, polygon[i], polygon[(i + 1) % polygon.length]);
    if (d < min) min = d;
  }
  return min;
}

function polygonCentroid(polygon: Point[]): Point {
  let area = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const cross = polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
    area += cross;
    cx += (polygon[i].x + polygon[j].x) * cross;
    cy += (polygon[i].y + polygon[j].y) * cross;
  }

  area *= 0.5;
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

export function classifyCentroid(centroid: Point, buffer = REGION_BUFFER): PlotRegionClass | null {
  const data = dataOf();
  let best: PlotRegionClass | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const os of data.openSpaces) {
    const d = pointToPolygonDistance(centroid, os.polygon);
    if (d < bestDistance) {
      bestDistance = d;
      best = "open";
    }
  }

  for (const ut of data.utilities) {
    const d = pointToPolygonDistance(centroid, ut.polygon);
    if (d < bestDistance) {
      bestDistance = d;
      best = "utility";
    }
  }

  return best && bestDistance <= buffer ? best : null;
}

const plotClassCache = new Map<string, (PlotRegionClass | null)[]>();

function plotClassByIndex(): (PlotRegionClass | null)[] {
  const key = getActiveLayoutKey();
  const hit = plotClassCache.get(key);
  if (hit) return hit;
  const data = dataOf();
  const index = data.plots.map((plot) =>
    classifyCentroid(polygonCentroid(plot.polygon))
  );
  plotClassCache.set(key, index);
  return index;
}

export function regionPlotFill(index: number): string | null {
  const cls = plotClassByIndex()[index];
  if (cls === "open") return FILL_PLOT_OPEN;
  if (cls === "utility") return FILL_PLOT_UTILITY;
  return null;
}
