import { Point } from "../types/dxf";
import {
  getRegionData,
  getPlotNumberMapping,
  getImageUnderlay,
  getActiveLayoutKey,
} from "../layouts";
import { roadCenterLines } from "./roadCenterLines";
import { addedRoads, addedRoadPolygons } from "./addedRoads";

interface RegionPolygon {
  polygon: Point[];
  area: number;
}

interface MappingEntry {
  id: string;
  plotNumber: number;
  polygon: Point[] | Point[][];
}

/** Accept both flat rings and wrapped ring arrays from the mapping JSON. */
function asPlotRing(poly: Point[] | Point[][]): Point[] {
  if (!Array.isArray(poly) || poly.length === 0) return [];
  const first = poly[0] as { x?: number };
  if (first && typeof first.x === "number") return poly as Point[];
  return ((poly as Point[][])[0] || []) as Point[];
}

/**
 * Plot polygons from the numbering layer source. A few plots exist only
 * here and not in regionData; decorations must treat them as real plots.
 */
function mappingPlots(): Point[][] {
  return (getPlotNumberMapping() as MappingEntry[])
    .map((e) => asPlotRing(e.polygon))
    .filter((poly) => poly.length >= 3);
}

interface RegionData {
  openSpaces: RegionPolygon[];
  utilities: RegionPolygon[];
  roads: RegionPolygon[];
  plots: RegionPolygon[];
}

const regionDataOf = (): RegionData =>
  getRegionData() as unknown as RegionData;

export interface RoadMarking {
  id: number;
  points: Point[];
}

export interface StreetLight {
  id: number;
  pos: Point;
  angle: number;
}

export interface TreeItem {
  id: number;
  pos: Point;
  r: number;
  variant: number;
}

export interface CarRoute {
  id: number;
  points: Point[];
  length: number;
}

/* -----------------------------
    Geometry helpers
------------------------------ */

function polygonBounds(polygon: Point[]) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const p of polygon) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

function pointInPolygon(x: number, y: number, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

interface PolyIndex {
  polys: { polygon: Point[]; minX: number; minY: number; maxX: number; maxY: number }[];
}

function buildIndex(polys: Point[][]): PolyIndex {
  return {
    polys: polys.map((polygon) => ({
      polygon,
      ...polygonBounds(polygon),
    })),
  };
}

function insideAnyIndex(x: number, y: number, index: PolyIndex): boolean {
  for (const entry of index.polys) {
    if (x < entry.minX || x > entry.maxX || y < entry.minY || y > entry.maxY)
      continue;
    if (pointInPolygon(x, y, entry.polygon)) return true;
  }
  return false;
}

function distanceToPolygonEdge(x: number, y: number, poly: Point[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j].x;
    const ay = poly[j].y;
    const bx = poly[i].x;
    const by = poly[i].y;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((x - ax) * dx + (y - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx;
    const py = ay + t * dy;
    const d = Math.hypot(x - px, y - py);
    if (d < best) best = d;
  }
  return best;
}

/** Min distance from a point to the nearest edge of any indexed polygon. */
function distanceToNearestEdge(
  x: number,
  y: number,
  index: PolyIndex,
  cutoff: number
): number {
  let best = cutoff;
  for (const entry of index.polys) {
    // Broad-phase: skip polygons whose bounds are already farther than cutoff.
    const bx =
      x < entry.minX
        ? entry.minX - x
        : x > entry.maxX
        ? x - entry.maxX
        : 0;
    const by =
      y < entry.minY
        ? entry.minY - y
        : y > entry.maxY
        ? y - entry.maxY
        : 0;
    if (Math.hypot(bx, by) >= best) continue;
    const d = distanceToPolygonEdge(x, y, entry.polygon);
    if (d < best) best = d;
  }
  return best;
}

function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

/**
 * Longest straight run of a polyline. Cars only ever drive straight along
 * the road axis, so bends and jogs in a center line are trimmed away.
 */
function longestStraightRun(points: Point[], tolRad = 0.14): Point[] {
  if (points.length < 2) return points.slice(0, 2);
  let bestA = 0;
  let bestB = 1;
  let bestLen = 0;
  let runStart = 0;
  let dirX = 0;
  let dirY = 0;
  const cosTol = Math.cos(tolRad);
  const flush = (endIdx: number) => {
    const l = Math.hypot(
      points[endIdx].x - points[runStart].x,
      points[endIdx].y - points[runStart].y
    );
    if (l > bestLen) {
      bestLen = l;
      bestA = runStart;
      bestB = endIdx;
    }
  };
  for (let i = 1; i < points.length; i++) {
    const ux = points[i].x - points[i - 1].x;
    const uy = points[i].y - points[i - 1].y;
    const segLen = Math.hypot(ux, uy);
    if (segLen < 1e-6) continue;
    const nx = ux / segLen;
    const ny = uy / segLen;
    if (i === 1 || nx * dirX + ny * dirY < cosTol) {
      if (i > 1) flush(i - 1);
      runStart = i - 1;
      dirX = nx;
      dirY = ny;
    }
  }
  flush(points.length - 1);
  return [
    { x: points[bestA].x, y: points[bestA].y },
    { x: points[bestB].x, y: points[bestB].y },
  ];
}

function resample(points: Point[], step: number): { pos: Point; angle: number }[] {
  const out: { pos: Point; angle: number }[] = [];
  if (points.length < 2) return out;
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (segLen < 0.0001) continue;
    const ux = (b.x - a.x) / segLen;
    const uy = (b.y - a.y) / segLen;
    let d = carry;
    while (d <= segLen) {
      out.push({ pos: { x: a.x + ux * d, y: a.y + uy * d }, angle: Math.atan2(uy, ux) });
      d += step;
    }
    carry = d - segLen;
  }
  return out;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/* -----------------------------
    MAP DECORATION CONFIG
    Every size is derived from the measured map scale:
    typical road width, plot size and layout dimensions.
    Nothing is hardcoded in pixels without relation to the map.
------------------------------ */

const scaleCache = new Map<
  string,
  { roadWidth: number; plotSize: number; mapWidth: number; mapHeight: number }
>();

function measureScale() {
  const key = getActiveLayoutKey();
  const hit = scaleCache.get(key);
  if (hit) return hit;

  const data = regionDataOf();

  // Effective road width = area / longest bbox side (exact for elongated strips).
  const widths: number[] = [];
  for (const road of data.roads) {
    const b = polygonBounds(road.polygon);
    const longSide = Math.max(b.maxX - b.minX, b.maxY - b.minY);
    if (longSide <= 0) continue;
    const w = road.area / longSide;
    if (w > 20 && w < 2000) widths.push(w); // ignore slivers and merged blobs
  }
  const roadWidth = Math.max(60, median(widths) || 300);

  const plotSizes: number[] = [];
  for (const plot of data.plots) {
    const b = polygonBounds(plot.polygon);
    plotSizes.push(Math.min(b.maxX - b.minX, b.maxY - b.minY));
  }
  const plotSize = Math.max(80, median(plotSizes) || 500);

  const bounds = layoutBounds();
  const result = {
    roadWidth,
    plotSize,
    mapWidth: bounds.maxX - bounds.minX,
    mapHeight: bounds.maxY - bounds.minY,
  };
  scaleCache.set(key, result);
  return result;
}

export interface DecorationConfig {
  /** Typical carriageway width in world units. */
  roadWidth: number;
  /** Tree crown diameter in world units (~22-30% of the landscaping strip). */
  treeDiameter: number;
  /** Minimum centre-to-centre spacing between trees (> 2 crowns). */
  treeMinSpacing: number;
  /** Minimum centre-to-centre spacing between street lights. */
  lightMinSpacing: number;
  /** Distance kept between a light and any tree. */
  lightTreeClearance: number;
  /** Street-light lamp head radius (world units). */
  lightLampRadius: number;
  /** Subtle glow radius around the lamp head (world units). */
  lightGlowRadius: number;
  /** Maximum number of lights rendered on the whole layout. */
  maxLights: number;
  /** Maximum number of trees rendered on the whole layout. */
  maxTrees: number;
  /** Car length/width in world units, scaled to road width. */
  carLength: number;
  carWidth: number;
}

const configCache = new Map<string, DecorationConfig>();

export function decorationConfig(): DecorationConfig {
  const key = getActiveLayoutKey();
  const hit = configCache.get(key);
  if (hit) return hit;
  const { roadWidth } = measureScale();

  // Crown ≈ 2.6x carriageway width (matches the reference master-plan look:
  // canopies clearly visible, gently overhanging roads, still far smaller
  // than a plot). All values are world units; layers scale them by the fit
  // scale so decorations stay proportional to this compact layout.
  const treeDiameter = Math.min(320, Math.max(60, roadWidth * 2.6));

  const result = {
    roadWidth,
    treeDiameter,
    treeMinSpacing: treeDiameter * 2.2,
    lightMinSpacing: roadWidth * 8,
    lightTreeClearance: treeDiameter * 1.2,
    lightLampRadius: Math.max(1.6, roadWidth * 0.03),
    lightGlowRadius: Math.max(14, roadWidth * 0.55),
    maxLights: 14,
    maxTrees: 46,
    carLength: roadWidth * 4.4,
    carWidth: roadWidth * 0.95,
  };
  configCache.set(key, result);
  return result;
}

/* -----------------------------
    Layout bounds
------------------------------ */

const boundsCache = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();

export function layoutBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
  const key = getActiveLayoutKey();
  const hit = boundsCache.get(key);
  if (hit) return hit;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const acc = (p: Point) => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  };
  const data = regionDataOf();
  data.roads.forEach((r) => r.polygon.forEach(acc));
  data.openSpaces.forEach((r) => r.polygon.forEach(acc));
  data.plots.forEach((r) => r.polygon.forEach(acc));

  // Image-only layouts have no region data yet: derive bounds from the image box.
  if (!Number.isFinite(minX)) {
    const underlay = getImageUnderlay();
    if (underlay) {
      minX = underlay.box.minX;
      minY = underlay.box.minY;
      maxX = underlay.box.minX + underlay.box.width;
      maxY = underlay.box.minY + underlay.box.height;
    } else {
      minX = 0;
      minY = 0;
      maxX = 1;
      maxY = 1;
    }
  }

  const result = { minX, minY, maxX, maxY };
  boundsCache.set(key, result);
  return result;
}

/* -----------------------------
    Road markings (dashed center lines)
------------------------------ */

const markingsCache = new Map<string, RoadMarking[]>();

export function roadMarkings(): RoadMarking[] {
  const key = getActiveLayoutKey();
  const hit = markingsCache.get(key);
  if (hit) return hit;
  const fromCenterLines = roadCenterLines()
    .filter((line) => polylineLength(line.points) > 200)
    .map((line) => line.points);
  // Added corridor roads get their dashed center lines too.
  const fromAdded = addedRoads().flatMap((r) => r.centerLines);
  const result = [...fromCenterLines, ...fromAdded]
    .filter((points) => polylineLength(points) > 200)
    .map((points, id) => ({ id, points }));
  markingsCache.set(key, result);
  return result;
}

/* -----------------------------
    Road edge lines
    Offset lines that follow the actual carriageway boundary of each road
    polygon, breaking naturally at intersections. Derived purely from the
    existing road geometry — roads themselves are not modified.
------------------------------ */

export interface RoadEdgeLine {
  id: number;
  points: Point[];
}

const edgesCache = new Map<string, RoadEdgeLine[]>();

export function roadEdgeLines(): RoadEdgeLine[] {
  const key = getActiveLayoutKey();
  const hit = edgesCache.get(key);
  if (hit) return hit;

  const cfg = decorationConfig();
  const data = regionDataOf();
  const roadPolys = data.roads.map((r) => r.polygon);
  const STEP = Math.max(12, cfg.roadWidth * 0.18);
  const INSET = cfg.roadWidth * 0.08;
  const MIN_RUN = cfg.roadWidth * 1.5;
  const edges: RoadEdgeLine[] = [];
  let id = 0;

  const findContaining = (x: number, y: number): Point[] | null => {
    for (const poly of roadPolys) {
      if (pointInPolygon(x, y, poly)) return poly;
    }
    return null;
  };

  for (const line of roadCenterLines()) {
    if (polylineLength(line.points) < MIN_RUN * 2) continue;
    for (const side of [1, -1]) {
      let run: Point[] = [];
      const flush = () => {
        if (run.length >= 2 && polylineLength(run) >= MIN_RUN) {
          edges.push({ id: id++, points: run });
        }
        run = [];
      };
      const samples = resample(line.points, STEP);
      for (const sample of samples) {
        const poly = findContaining(sample.pos.x, sample.pos.y);
        if (!poly) {
          flush();
          continue;
        }
        // Walk outward from the center line until leaving this road polygon.
        const nx = -Math.sin(sample.angle) * side;
        const ny = Math.cos(sample.angle) * side;
        let lastInside: Point | null = null;
        let d = STEP * 0.5;
        for (; d <= cfg.roadWidth * 0.9; d += STEP * 0.5) {
          const px = sample.pos.x + nx * d;
          const py = sample.pos.y + ny * d;
          if (!pointInPolygon(px, py, poly)) break;
          lastInside = { x: px, y: py };
        }
        // Too close to the edge (narrow section): no edge line here.
        if (!lastInside || d < cfg.roadWidth * 0.45) {
          flush();
          continue;
        }
        run.push({
          x: lastInside.x - nx * INSET,
          y: lastInside.y - ny * INSET,
        });
      }
      flush();
    }
  }

  edgesCache.set(key, edges);
  return edges;
}

/* -----------------------------
    Trees (parks + roadside strips)
    Each tree sits in the free strip between a road edge and the neighbouring
    plot boundary, sized so the crown touches both — like landscaped master
    plans. Narrow strips get smaller trees; impossible spots get none.
-------------------------------*/

const treesCache = new Map<string, TreeItem[]>();

/** Step outward until leaving `poly`; returns exit distance and last inside point. */
function walkToEdge(
  from: Point,
  nx: number,
  ny: number,
  poly: Point[],
  maxStep: number
): { edgeDist: number; point: Point } | null {
  let lastInside: Point | null = null;
  for (let d = 3; d <= maxStep; d += 3) {
    const px = from.x + nx * d;
    const py = from.y + ny * d;
    if (!pointInPolygon(px, py, poly)) {
      if (!lastInside) return null;
      return { edgeDist: d - 3, point: lastInside };
    }
    lastInside = { x: px, y: py };
  }
  return { edgeDist: maxStep, point: lastInside as Point };
}

export function trees(): TreeItem[] {
  const key = getActiveLayoutKey();
  const hit = treesCache.get(key);
  if (hit) return hit;

  const cfg = decorationConfig();
  const data = regionDataOf();
  const R = cfg.treeDiameter / 2;
  const MIN_R = Math.max(26, cfg.roadWidth * 0.42);
  const plotsIndex = buildIndex(data.plots.map((r) => r.polygon));
  const roadsIndex = buildIndex([
    ...data.roads.map((r) => r.polygon),
    ...addedRoadPolygons(), // keep trees out of the added corridors
  ]);
  const utilitiesIndex = buildIndex(data.utilities.map((r) => r.polygon));
  const bounds = layoutBounds();
  const result: TreeItem[] = [];
  let id = 0;

  /** Free radius around a point: how big a crown can be here without
   *  covering a plot (6u buffer), a utility, or spilling out of bounds.
   *  Points inside any road/utility/plot have no room at all.
   *  Touching road edges and open-space borders is allowed. */
  const freeRadius = (x: number, y: number): number => {
    if (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY)
      return 0;
    if (
      insideAnyIndex(x, y, roadsIndex) ||
      insideAnyIndex(x, y, utilitiesIndex) ||
      insideAnyIndex(x, y, plotsIndex)
    )
      return 0;
    let clear = Math.min(x - bounds.minX, bounds.maxX - x, y - bounds.minY, bounds.maxY - y);
    clear = Math.min(clear, distanceToNearestEdge(x, y, plotsIndex, R + 40) - 6);
    clear = Math.min(clear, distanceToNearestEdge(x, y, utilitiesIndex, R + 40) - 10);
    clear = Math.min(clear, distanceToNearestEdge(x, y, roadsIndex, R + 40));
    return clear;
  };

  const tryAddTree = (x: number, y: number, rLocal: number): boolean => {
    // Crowns never touch: centre distance >= sum of radii x 2.
    for (const tree of result) {
      const dx = tree.pos.x - x;
      const dy = tree.pos.y - y;
      const need = (tree.r + rLocal) * 2;
      if (dx * dx + dy * dy < need * need) return false;
    }
    result.push({
      id: id++,
      pos: { x, y },
      r: rLocal * (0.9 + ((id * 37) % 5) * 0.05),
      variant: id % 3,
    });
    return true;
  };

  // 1) Park / open-space trees — sized to fit their pocket inside the park.
  for (const space of data.openSpaces) {
    if (result.length >= cfg.maxTrees) break;
    const b = polygonBounds(space.polygon);
    const capacity = Math.max(
      1,
      Math.min(8, Math.round(space.area / ((cfg.treeDiameter * 3.2) ** 2)))
    );
    let placed = 0;
    const step = cfg.treeDiameter * 3.2;
    for (
      let y = b.minY + step * 0.5;
      y <= b.maxY - step * 0.5 && placed < capacity && result.length < cfg.maxTrees;
      y += step
    ) {
      for (
        let x = b.minX + step * 0.5;
        x <= b.maxX - step * 0.5 && placed < capacity && result.length < cfg.maxTrees;
        x += step
      ) {
        const jx = x + (((x * 13 + y * 7) % 21) - 10);
        const jy = y + (((x * 5 + y * 17) % 21) - 10);
        if (!pointInPolygon(jx, jy, space.polygon)) continue;
        const parkClear = distanceToPolygonEdge(jx, jy, space.polygon);
        const clear = Math.min(parkClear, freeRadius(jx, jy));
        const rLocal = Math.min(R, clear * 0.92);
        if (rLocal < MIN_R) continue;
        if (tryAddTree(jx, jy, rLocal)) placed++;
      }
    }
  }

  // 2) Roadside trees — planted in the strip between the road edge and the
  //    neighbouring plot, crown touching both. Sized to the measured strip.
  let roadside = 0;
  const MAX_ROADSIDE = 28;
  const SCAN_LIMIT = cfg.roadWidth * 2 + cfg.treeDiameter;
  outer: for (const line of roadCenterLines()) {
    if (polylineLength(line.points) < cfg.treeDiameter * 3) continue;
    const samples = resample(line.points, cfg.treeDiameter * 1.6);
    for (let i = 0; i < samples.length; i++) {
      if (roadside >= MAX_ROADSIDE || result.length >= cfg.maxTrees) break outer;
      const side = i % 2 === 0 ? 1 : -1;
      const s = samples[i];
      const nx = -Math.sin(s.angle) * side;
      const ny = Math.cos(s.angle) * side;

      // Which road polygon holds this sample? Walk outward to its edge.
      let roadPoly: Point[] | null = null;
      for (const entry of roadsIndex.polys) {
        if (
          s.pos.x < entry.minX ||
          s.pos.x > entry.maxX ||
          s.pos.y < entry.minY ||
          s.pos.y > entry.maxY
        )
          continue;
        if (pointInPolygon(s.pos.x, s.pos.y, entry.polygon)) {
          roadPoly = entry.polygon;
          break;
        }
      }
      if (!roadPoly) continue;
      const edge = walkToEdge(s.pos, nx, ny, roadPoly, cfg.roadWidth * 12);
      // Street-like corridors only: the carriageway edge must be close.
      // (Giant road-classified areas are open ground, not streets.)
      if (!edge || edge.edgeDist > cfg.roadWidth * 2.5) continue;

      // Measure the free strip beyond the road edge (to the first plot,
      // utility, neighbouring carriageway or the layout boundary).
      let stripW = SCAN_LIMIT;
      for (let d = 4; d <= SCAN_LIMIT; d += 4) {
        const px = edge.point.x + nx * d;
        const py = edge.point.y + ny * d;
        if (px < bounds.minX || px > bounds.maxX || py < bounds.minY || py > bounds.maxY) {
          stripW = d;
          break;
        }
        if (insideAnyIndex(px, py, plotsIndex) || insideAnyIndex(px, py, utilitiesIndex)) {
          stripW = d;
          break;
        }
        let hitOtherRoad = false;
        for (const entry of roadsIndex.polys) {
          if (entry.polygon === roadPoly) continue;
          if (
            px < entry.minX ||
            px > entry.maxX ||
            py < entry.minY ||
            py > entry.maxY
          )
            continue;
          if (pointInPolygon(px, py, entry.polygon)) {
            hitOtherRoad = true;
            break;
          }
        }
        if (hitOtherRoad) {
          stripW = d;
          break;
        }
      }

      // Centre the tree in the measured gap: the crown then touches the road
      // edge on one side and the plot / opposite boundary on the other.
      // Narrow gaps simply produce smaller street trees.
      if (stripW < 30) continue;
      const rLocal = Math.min(R, stripW * 0.47);
      const cx = edge.point.x + nx * (stripW * 0.5);
      const cy = edge.point.y + ny * (stripW * 0.5);
      // Verify the chosen spot really clears plots/utilities at this size.
      if (freeRadius(cx, cy) < rLocal * 0.8) continue;
      if (tryAddTree(cx, cy, rLocal)) roadside++;
    }
  }

  treesCache.set(key, result);
  return result;
}

/* -----------------------------
    Street lights
    Far sparser than trees: few lights, wide intervals,
    prioritising long main roads. Never co-located with a tree.
------------------------------ */

const lightsCache = new Map<string, StreetLight[]>();

export function streetLights(): StreetLight[] {
  const key = getActiveLayoutKey();
  const hit = lightsCache.get(key);
  if (hit) return hit;

  const cfg = decorationConfig();
  const data = regionDataOf();
  const plotsIndex = buildIndex(data.plots.map((r) => r.polygon));
  const utilitiesIndex = buildIndex(data.utilities.map((r) => r.polygon));
  const addedRoadIndex = buildIndex(addedRoadPolygons());
  const treeItems = trees();
  const bounds = layoutBounds();
  const lights: StreetLight[] = [];
  let id = 0;

  const tooClose = (x: number, y: number) => {
    for (const l of lights) {
      if (Math.hypot(l.pos.x - x, l.pos.y - y) < cfg.lightMinSpacing) return true;
    }
    for (const t of treeItems) {
      const need = Math.max(t.r * 1.5, cfg.roadWidth * 0.9);
      if (Math.hypot(t.pos.x - x, t.pos.y - y) < need) return true;
    }
    return false;
  };

  // Only the longest (main) roads get lights, at most two per road.
  const lines = roadCenterLines()
    .map((line) => ({ points: line.points, length: polylineLength(line.points) }))
    .filter((line) => line.length > cfg.roadWidth * 6)
    .sort((a, b) => b.length - a.length)
    .slice(0, 10);

  outer: for (const line of lines) {
    const samples = resample(line.points, line.length / 40);
    // Two positions per road at ~1/3 and ~2/3 of its length.
    for (const frac of [0.36, 0.72]) {
      if (lights.length >= cfg.maxLights) break outer;
      const idx = Math.min(samples.length - 1, Math.floor(samples.length * frac));
      const sample = samples[idx];
      const nx = -Math.sin(sample.angle);
      const ny = Math.cos(sample.angle);
      // Prefer the pole just off the carriageway; fall back slightly inward,
      // but never onto a plot or utility.
      let placed = false;
      for (const off of [
        cfg.roadWidth * 0.56,
        cfg.roadWidth * 0.44,
        cfg.roadWidth * 0.68,
      ]) {
        const x = sample.pos.x + nx * off;
        const y = sample.pos.y + ny * off;
        if (x < bounds.minX + 10 || x > bounds.maxX - 10) continue;
        if (y < bounds.minY + 10 || y > bounds.maxY - 10) continue;
        if (insideAnyIndex(x, y, plotsIndex)) continue;
        if (insideAnyIndex(x, y, utilitiesIndex)) continue;
        if (insideAnyIndex(x, y, addedRoadIndex)) continue; // not inside added corridors
        if (tooClose(x, y)) continue;
        lights.push({ id: id++, pos: { x, y }, angle: sample.angle });
        placed = true;
        break;
      }
      if (!placed) continue;
    }
  }

  lightsCache.set(key, lights);
  return lights;
}

/* -----------------------------
    Car routes (longest road center lines)
------------------------------ */

const routesCache = new Map<string, CarRoute[]>();

export function carRoutes(): CarRoute[] {
  const key = getActiveLayoutKey();
  const hit = routesCache.get(key);
  if (hit) return hit;
  const cfg = decorationConfig();
  const data = regionDataOf();
  // Cars may only drive on painted carriageway: every sample of a route
  // must fall inside a grey road polygon (data roads or added corridors)
  // AND outside any plot / open space / utility, since those are drawn
  // above the roads and hide them.
  const roadIndex = buildIndex([
    ...data.roads.map((r) => r.polygon),
    ...addedRoadPolygons(),
  ]);
  const blocked = buildIndex([
    ...data.plots,
    ...data.openSpaces,
    ...data.utilities,
    ...mappingPlots().map((polygon) => ({ polygon, area: 0 })),
  ].map((r) => r.polygon));
  const onGreyRoad = (points: Point[]) => {
    const samples = resample(points, 40);
    return (
      samples.length > 0 &&
      samples.every(
        (s) =>
          insideAnyIndex(s.pos.x, s.pos.y, roadIndex) &&
          !insideAnyIndex(s.pos.x, s.pos.y, blocked)
      )
    );
  };
  // Full body clearance: the whole swept car rectangle must stay on grey
  // carriageway - both lateral edges AND the nose/tail that extends half a
  // car length past the path endpoints (animateMotion moves the centre).
  const halfW = cfg.carWidth / 2 + 4;
  const halfL = cfg.carLength / 2;
  const sweepClear = (a: Point, b: Point) => {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 1) return false;
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    const nx = -uy;
    const ny = ux;
    const steps = 18;
    for (let k = 0; k <= steps; k++) {
      const along = -halfL + ((len + 2 * halfL) * k) / steps;
      const bx = a.x + ux * along;
      const by = a.y + uy * along;
      for (const side of [1, -1]) {
        const x = bx + nx * halfW * side;
        const y = by + ny * halfW * side;
        if (
          !insideAnyIndex(x, y, roadIndex) ||
          insideAnyIndex(x, y, blocked)
        ) {
          return false;
        }
      }
    }
    return true;
  };
  // Trim route ends inward until the body sweep fits; drop routes that
  // cannot fit even after trimming.
  const trimToFit = (points: Point[]): Point[] | null => {
    const [a, b] = points;
    const total = Math.hypot(b.x - a.x, b.y - a.y);
    if (total < 1) return null;
    const ux = (b.x - a.x) / total;
    const uy = (b.y - a.y) / total;
    const step = Math.max(10, total * 0.02);
    const maxTrim = total * 0.35;
    let trimA = 0;
    let trimB = 0;
    while (trimA + trimB <= maxTrim) {
      const pa = { x: a.x + ux * trimA, y: a.y + uy * trimA };
      const pb = { x: b.x - ux * trimB, y: b.y - uy * trimB };
      if (sweepClear(pa, pb)) return [pa, pb];
      if (trimA <= trimB) trimA += step;
      else trimB += step;
    }
    return null;
  };
  // Existing road center lines plus the added corridor center lines.
  // Each line is reduced to its longest straight run so cars move straight
  // along the road axis only.
  const candidates = [
    ...roadCenterLines().map((line) => longestStraightRun(line.points)),
    ...addedRoads().flatMap((r) => r.centerLines).map((points) => longestStraightRun(points)),
  ]
    .map((points) => ({ points, length: polylineLength(points) }))
    .filter((line) => line.length > cfg.roadWidth * 4)
    .filter((line) => onGreyRoad(line.points))
    .map((line) => ({ points: trimToFit(line.points), length: line.length }))
    .filter((line): line is { points: Point[]; length: number } => line.points !== null)
    .map((line) => ({ points: line.points, length: polylineLength(line.points) }))
    .filter((line) => line.length > cfg.roadWidth * 4)
    .sort((a, b) => b.length - a.length);

  // Drop routes that overlap an already accepted one (duplicate center
  // lines on the same street would put cars on top of each other).
  interface Accepted {
    points: Point[];
    length: number;
    samples: Point[];
  }
  const accepted: Accepted[] = [];
  const nearLimit = cfg.roadWidth * 1.5;
  for (const cand of candidates) {
    const samples = resample(cand.points, 80).map((s) => s.pos);
    const duplicate = accepted.some((acc) => {
      let near = 0;
      for (const p of samples) {
        for (const q of acc.samples) {
          if (Math.hypot(q.x - p.x, q.y - p.y) < nearLimit) {
            near += 1;
            break;
          }
        }
      }
      return near / Math.max(1, samples.length) > 0.5;
    });
    if (!duplicate) accepted.push({ ...cand, samples });
  }

  const result = accepted.map((route, id) => ({
    id,
    points: route.points,
    length: route.length,
  }));
  routesCache.set(key, result);
  return result;
}
