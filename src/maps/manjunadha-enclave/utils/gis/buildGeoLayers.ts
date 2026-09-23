import type { Point } from "../../types/dxf";
import {
  getPlotNumberMapping,
  getRoads,
  getExistingRoads,
  getOpenSpaces,
  getUtilities,
  getLayoutBoundary,
} from "../../layouts";
import { worldToLatLng, worldPointsToLatLng } from "./geoTransform";

export interface GeoPlot {
  id: string;
  plotNumber: number | string;
  positions: [number, number][];
  center: [number, number];
  areaSqYd: number | null;
  hatch?: "green" | "blue" | null;
}

export interface GeoRoadSegment {
  from: [number, number];
  to: [number, number];
}

export interface GeoRoad {
  id: string;
  type: string;
  positions: [number, number][];
  centerlineSegments: GeoRoadSegment[];
  label?: string;
  labelCenter?: [number, number];
  labelAngleDeg?: number;
}

export interface GeoRegion {
  id: string;
  label: string;
  positions: [number, number][];
  labelCenter: [number, number];
}

export interface GeoTree {
  pos: [number, number];
  seed: number;
}

export interface GeoLayers {
  plots: GeoPlot[];
  roads: GeoRoad[];
  existingRoads: GeoRoad[];
  openSpaces: GeoRegion[];
  utilities: GeoRegion[];
  boundaryPolyline: [number, number][];
  trees: GeoTree[];
}

/* -----------------------------------------------------------------------
 * Road long-axis + label-fit math -- unchanged from the old screen-space
 * RoadLayer.tsx, just operating in world units (inches) before conversion
 * to lat/lng, since the "does this label fit in this band" decision is a
 * physical-size question, not a screen-pixel one.
 * ---------------------------------------------------------------------*/

function longAxis(pts: Point[]): { angle: number } {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  if (height > width) return { angle: -90 };
  let left = pts[0];
  let right = pts[0];
  for (const p of pts) {
    if (p.x < left.x) left = p;
    if (p.x > right.x) right = p;
  }
  const angle = (Math.atan2(right.y - left.y, right.x - left.x) * 180) / Math.PI;
  return { angle };
}

const FONT_SIZE_WORLD = 108; // ~9ft glyph height in inches, matches old SVG fontSize=9 (world units)
const CHAR_WIDTH_WORLD = FONT_SIZE_WORLD * 0.62;

interface RoadEntryLike {
  id: string;
  type: string;
  label?: string;
  polygon: Point[];
  path?: Point[];
}

function buildRoad(r: RoadEntryLike, anchorWorld: { x: number; y: number }): GeoRoad | null {
  const positions = worldPointsToLatLng(r.polygon, anchorWorld);
  if (!positions) return null;

  const cx = r.polygon.reduce((s, p) => s + p.x, 0) / r.polygon.length;
  const cy = r.polygon.reduce((s, p) => s + p.y, 0) / r.polygon.length;
  const axisPts = r.path ?? r.polygon;
  const { angle } = longAxis(axisPts);
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const projections = r.polygon.map((p) => (p.x - cx) * dx + (p.y - cy) * dy);
  const half = (Math.max(...projections) - Math.min(...projections)) / 2;

  const label = r.label;
  const textHalfLen = label ? (label.length * CHAR_WIDTH_WORLD) / 2 : 0;
  const margin = FONT_SIZE_WORLD * 0.8;
  const labelFits = !!label && textHalfLen + margin < half;

  const worldSegments = labelFits
    ? [
        { from: -half, to: -textHalfLen - margin / 2 },
        { from: textHalfLen + margin / 2, to: half },
      ]
    : [{ from: -half, to: half }];

  const centerlineSegments: GeoRoadSegment[] = [];
  for (const seg of worldSegments) {
    const fromLL = worldToLatLng(cx + dx * seg.from, cy + dy * seg.from, anchorWorld);
    const toLL = worldToLatLng(cx + dx * seg.to, cy + dy * seg.to, anchorWorld);
    if (!fromLL || !toLL) return null;
    centerlineSegments.push({ from: [fromLL.lat, fromLL.lng], to: [toLL.lat, toLL.lng] });
  }

  let labelCenter: [number, number] | undefined;
  if (labelFits) {
    const c = worldToLatLng(cx, cy, anchorWorld);
    if (c) labelCenter = [c.lat, c.lng];
  }

  return {
    id: r.id,
    type: r.type,
    positions,
    centerlineSegments,
    label: labelFits ? label : undefined,
    labelCenter,
    labelAngleDeg: angle,
  };
}

interface RegionEntryLike {
  id: string;
  label: string;
  polygon: Point[];
  center?: Point;
}

function buildRegion(r: RegionEntryLike, anchorWorld: { x: number; y: number }): GeoRegion | null {
  const positions = worldPointsToLatLng(r.polygon, anchorWorld);
  if (!positions) return null;
  const labelSrc =
    r.center ?? {
      x: r.polygon.reduce((s, p) => s + p.x, 0) / r.polygon.length,
      y: r.polygon.reduce((s, p) => s + p.y, 0) / r.polygon.length,
    };
  const c = worldToLatLng(labelSrc.x, labelSrc.y, anchorWorld);
  if (!c) return null;
  return { id: r.id, label: r.label, positions, labelCenter: [c.lat, c.lng] };
}

/* -----------------------------------------------------------------------
 * Boundary tree ring -- same perimeter-sampling + outward-push math as the
 * old screen-space LayoutBoundaryLayer.tsx, in world units, then converted
 * to lat/lng. As real geographic Markers (fixed small pixel icon at an
 * exact lat/lng point) instead of directional SVG shapes drawn relative to
 * a local anchor line, there's no more "canopy grows into the plot" issue
 * to correct for -- a marker just sits at its point, so the earlier
 * north/south flip hack is no longer needed.
 * ---------------------------------------------------------------------*/

const TREE_COUNT = 25;
const TREE_PUSH_WORLD = 7 * 2.4; // matches old CANOPY_R * 2.4

function perimeterPoints(polygon: Point[], count: number, skipEdge?: (a: Point, b: Point) => boolean): Point[] {
  const edges = polygon
    .map((a, i) => ({ a, b: polygon[(i + 1) % polygon.length] }))
    .filter(({ a, b }) => !skipEdge?.(a, b));
  const lengths = edges.map(({ a, b }) => Math.hypot(b.x - a.x, b.y - a.y));
  const total = lengths.reduce((s, l) => s + l, 0);
  if (total <= 0) return [];
  const pts: Point[] = [];
  const step = total / count;
  let edgeIdx = 0;
  let coveredBefore = 0;
  for (let i = 0; i < count; i++) {
    const target = step * i;
    while (edgeIdx < edges.length - 1 && coveredBefore + lengths[edgeIdx] < target) {
      coveredBefore += lengths[edgeIdx];
      edgeIdx++;
    }
    const { a, b } = edges[edgeIdx];
    const t = lengths[edgeIdx] > 0 ? (target - coveredBefore) / lengths[edgeIdx] : 0;
    pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return pts;
}

function pushOutward(p: Point, bounds: { minX: number; minY: number; maxX: number; maxY: number }, amount: number): Point {
  const out = { ...p };
  if (Math.abs(p.x - bounds.minX) < 1) out.x -= amount;
  else if (Math.abs(p.x - bounds.maxX) < 1) out.x += amount;
  if (Math.abs(p.y - bounds.minY) < 1) out.y -= amount;
  else if (Math.abs(p.y - bounds.maxY) < 1) out.y += amount;
  return out;
}

/**
 * Builds every layer's geometry ONCE, fully converted to lat/lng, ready to
 * hand straight to native Leaflet vector components (Polygon/Polyline/
 * Marker). This is the "local vector -> GIS transform -> lat/lng geometry"
 * step the architecture requires -- it never touches screen pixels.
 * Returns null when GIS is not configured (no anchor).
 */
export function buildGeoLayers(anchorWorld: { x: number; y: number }): GeoLayers | null {
  const plotsSrc = getPlotNumberMapping();
  const plots: GeoPlot[] = [];
  for (const p of plotsSrc) {
    const positions = worldPointsToLatLng(p.polygon, anchorWorld);
    const c = worldToLatLng(p.center.x, p.center.y, anchorWorld);
    if (!positions || !c) return null;
    plots.push({
      id: p.id,
      plotNumber: p.plotNumber,
      positions,
      center: [c.lat, c.lng],
      areaSqYd: p.areaSqYd,
      hatch: p.hatch,
    });
  }

  const roads: GeoRoad[] = [];
  for (const r of getRoads()) {
    const gr = buildRoad(r, anchorWorld);
    if (!gr) return null;
    roads.push(gr);
  }

  const existingRoads: GeoRoad[] = [];
  for (const r of getExistingRoads()) {
    const gr = buildRoad(r, anchorWorld);
    if (!gr) return null;
    existingRoads.push(gr);
  }

  const openSpaces: GeoRegion[] = [];
  for (const r of getOpenSpaces()) {
    const gr = buildRegion(r, anchorWorld);
    if (!gr) return null;
    openSpaces.push(gr);
  }

  const utilities: GeoRegion[] = [];
  for (const r of getUtilities()) {
    const gr = buildRegion(r, anchorWorld);
    if (!gr) return null;
    utilities.push(gr);
  }

  const boundary = getLayoutBoundary();
  const xs = boundary.polygon.map((p) => p.x);
  const ys = boundary.polygon.map((p) => p.y);
  const bounds = { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
  const isEastEdge = (a: Point, b: Point) => Math.abs(a.x - bounds.maxX) < 1 && Math.abs(b.x - bounds.maxX) < 1;

  const donkaPts = getExistingRoads()[0]?.polygon ?? [];
  const westAt = (targetY: number) =>
    donkaPts.reduce(
      (best, p) => (Math.abs(p.y - targetY) < Math.abs(best.y - targetY) ? p : best),
      donkaPts[0] ?? { x: bounds.maxX, y: targetY }
    ).x;
  const donkaWestAtTop = westAt(bounds.minY);
  const donkaWestAtBottom = westAt(bounds.maxY);

  const boundaryPolyline = worldPointsToLatLng(
    [
      { x: donkaWestAtBottom, y: bounds.maxY },
      { x: bounds.minX, y: bounds.maxY },
      { x: bounds.minX, y: bounds.minY },
      { x: donkaWestAtTop, y: bounds.minY },
    ],
    anchorWorld
  );
  if (!boundaryPolyline) return null;

  const treePts = perimeterPoints(boundary.polygon, TREE_COUNT, isEastEdge).map((p) =>
    pushOutward(p, bounds, TREE_PUSH_WORLD)
  );
  const trees: GeoTree[] = [];
  treePts.forEach((p, i) => {
    const ll = worldToLatLng(p.x, p.y, anchorWorld);
    if (!ll) return;
    trees.push({ pos: [ll.lat, ll.lng], seed: i });
  });

  return { plots, roads, existingRoads, openSpaces, utilities, boundaryPolyline, trees };
}
