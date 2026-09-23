import { Point } from "../types/dxf";
import { getRegionData, getPlotNumberMapping } from "../layouts";
import { getActiveLayoutKey } from "../layouts";

export const CROSS_LINE_PLOT_NUMBERS = [
  1, 2, 3, 31, 32, 33, 51, 66, 67, 68, 69, 70, 71, 86,
];

interface RegionPolygon {
  polygon: Point[];
  area: number;
}

interface RegionData {
  roads: RegionPolygon[];
}

interface MappingPlot {
  id: string;
  plotNumber: number;
  polygon: Point[];
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function polygonBounds(polygon: Point[]): Bounds {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  polygon.forEach((v) => {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
  });
  return { minX, minY, maxX, maxY };
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

const listedPlotsCache = new Map<string, { id: string; bounds: Bounds }[]>();

function listedPlots(): { id: string; bounds: Bounds }[] {
  const key = getActiveLayoutKey();
  const hit = listedPlotsCache.get(key);
  if (hit) return hit;
  const mapping = getPlotNumberMapping() as MappingPlot[];
  const result = mapping
    .filter((p) => CROSS_LINE_PLOT_NUMBERS.includes(p.plotNumber))
    .map((p) => ({ id: p.id, bounds: polygonBounds(p.polygon) }));
  listedPlotsCache.set(key, result);
  return result;
}

const crossLineRoadIndexCache = new Map<string, Map<number, string>>();

function buildCrossLineRoadIndex(): Map<number, string> {
  const key = getActiveLayoutKey();
  const hit = crossLineRoadIndexCache.get(key);
  if (hit) return hit;

  const crossLineRoadIndex = new Map<number, string>();
  const data = getRegionData() as RegionData;
  data.roads.forEach((road, index) => {
    const center = polygonCentroid(road.polygon);
    const match = listedPlots().find(
      (plot) =>
        center.x >= plot.bounds.minX &&
        center.x <= plot.bounds.maxX &&
        center.y >= plot.bounds.minY &&
        center.y <= plot.bounds.maxY
    );
    if (match) {
      crossLineRoadIndex.set(index, match.id);
    }
  });
  crossLineRoadIndexCache.set(key, crossLineRoadIndex);
  return crossLineRoadIndex;
}

export function isCrossLineRoad(index: number): boolean {
  return buildCrossLineRoadIndex().has(index);
}

export function crossLinePlotId(index: number): string | undefined {
  return buildCrossLineRoadIndex().get(index);
}
