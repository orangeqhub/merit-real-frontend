import { Point } from "../types/dxf";
import { getRegionData, getPlotNumberMapping, getActiveLayoutKey } from "../layouts";

/* -----------------------------
    Added roads
    Corridors in the layout that are flanked by plots but have no
    carriageway drawn: vertical strips between facing plot columns and
    horizontal strips between facing plot rows. Each corridor fills the
    empty gap edge-to-edge, touching every bordering plot. Edges are traced
    row by row (column by column for horizontal bands) and pushed inward
    where an irregular plot corner pokes in, so no plot is ever covered.
    Source data files are never modified; these polygons are render-only.
-------------------------------*/

export interface AddedRoad {
  id: number;
  polygons: Point[][];
  centerLines: Point[][];
}

interface RegionPolygon {
  polygon: Point[];
  area: number;
}

const regionDataOf = (): {
  plots: RegionPolygon[];
  utilities: RegionPolygon[];
  openSpaces: RegionPolygon[];
} => getRegionData() as unknown as {
  plots: RegionPolygon[];
  utilities: RegionPolygon[];
  openSpaces: RegionPolygon[];
};

interface MappingEntry {
  id: string;
  plotNumber: number;
  polygon: Point[] | Point[][];
}

/** Accept both flat rings and wrapped ring arrays from the mapping JSON. */
function asRing(poly: Point[] | Point[][]): Point[] {
  if (!Array.isArray(poly) || poly.length === 0) return [];
  const first = poly[0] as { x?: number };
  if (first && typeof first.x === "number") return poly as Point[];
  return ((poly as Point[][])[0] || []) as Point[];
}

/**
 * Plot polygons from the numbering layer source. A few plots exist only
 * here and not in regionData; corridors must treat them as real edges.
 */
function mappingPlots(): Point[][] {
  return (getPlotNumberMapping() as MappingEntry[])
    .map((e) => asRing(e.polygon))
    .filter((poly) => poly.length >= 3);
}

/** Every plot footprint known to the layout (regionData + numbering). */
function allPlotPolygons(): Point[][] {
  return [...regionDataOf().plots.map((r) => r.polygon), ...mappingPlots()];
}

/** Coarse vertical corridor bands (world units): [leftEdgeX, rightEdgeX]. */
const VERTICAL_BANDS: { x0: number; x1: number }[] = [
  { x0: 26901, x1: 27376 }, // west block
  { x0: 28578, x1: 29053 }, // west block
  { x0: 30347, x1: 30822 }, // west block
  { x0: 33846, x1: 34321 }, // east block (plots 57-68 | 34-44)
  { x0: 35597, x1: 36069 }, // east block (plots 23-33 | 1-10)
  { x0: 38160, x1: 38670 }, // east block (staggered edges)
];

/** Coarse horizontal corridor bands: [topEdgeY, bottomEdgeY]. */
const HORIZONTAL_BANDS: { y0: number; y1: number }[] = [
  { y0: 9398, y1: 9873 }, // full width (rows 9/20/37/48 above, 10/19/38/47 below)
];

const STEP = 16; // scan resolution along the corridor
const EDGE_TOL = 42; // plot edge may sit this far from the nominal band edge
const MIN_WIDTH = 360;
const MIN_RUN = 800;

function polygonBounds(polygon: Point[]) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of polygon) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

interface PlotBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function pointInPolygon(x: number, y: number, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const cache = new Map<string, AddedRoad[]>();

/** True when the point falls inside any plot / utility / open space. */
function inObstacle(x: number, y: number): boolean {
  const d = regionDataOf();
  for (const group of [allPlotPolygons(), d.utilities.map((r) => r.polygon), d.openSpaces.map((r) => r.polygon)]) {
    for (const poly of group) {
      if (pointInPolygon(x, y, poly)) return true;
    }
  }
  return false;
}

interface Run {
  a: number; // start coordinate along the corridor axis
  b: number; // end coordinate along the corridor axis
  lo: number; // near edge (perpendicular)
  hi: number; // far edge (perpendicular)
}

/** Merge consecutive scanned slices with matching edges into rectangles.
 *  A run always uses its most inward observed edges, so slowly drifting
 *  (slanted) plot boundaries can never end up covered by the road. */
function mergeRuns(
  runs: Run[],
  toPolygon: (run: Run) => Point[],
  toCenterLine: (run: Run) => Point[],
  outPolygons: Point[][],
  outCenterLines: Point[][]
) {
  if (!runs.length) return;
  let start = runs[0];
  let prev = runs[0];
  let loIn = Math.max(start.lo, prev.lo); // inward-most near edge
  let hiIn = Math.min(start.hi, prev.hi); // inward-most far edge
  const flush = () => {
    if (
      prev.b - start.a >= STEP * 2 &&
      hiIn - loIn >= MIN_WIDTH * 0.5 // fully pinched runs are dropped
    ) {
      const run: Run = { a: start.a, b: prev.b, lo: loIn, hi: hiIn };
      outPolygons.push(toPolygon(run));
      outCenterLines.push(toCenterLine(run));
    }
  };
  for (let i = 1; i < runs.length; i++) {
    const cur = runs[i];
    if (
      Math.abs(cur.lo - prev.lo) > 2 ||
      Math.abs(cur.hi - prev.hi) > 2 ||
      // Slowly drifting (slanted) edges also break the run once they wander
      // too far from where the run started.
      Math.abs(cur.lo - start.lo) > 14 ||
      Math.abs(cur.hi - start.hi) > 14 ||
      cur.a - prev.b > STEP * 1.5
    ) {
      flush();
      start = cur;
      loIn = cur.lo;
      hiIn = cur.hi;
    } else {
      loIn = Math.max(loIn, cur.lo);
      hiIn = Math.min(hiIn, cur.hi);
    }
    prev = cur;
  }
  flush();
}

export function addedRoads(): AddedRoad[] {
  const key = getActiveLayoutKey();
  const hit = cache.get(key);
  if (hit) return hit;

  const boxes: PlotBox[] = allPlotPolygons().map((polygon) =>
    polygonBounds(polygon)
  );
  const roads: AddedRoad[] = [];

  // --- vertical corridors: scan rows, flankers left/right ---
  VERTICAL_BANDS.forEach((band, id) => {
    let yMin = Infinity;
    let yMax = -Infinity;
    for (const b of boxes) {
      if (
        Math.abs(b.maxX - band.x0) < EDGE_TOL ||
        Math.abs(b.minX - band.x1) < EDGE_TOL
      ) {
        yMin = Math.min(yMin, b.minY);
        yMax = Math.max(yMax, b.maxY);
      }
    }
    if (!Number.isFinite(yMin) || yMax - yMin < MIN_RUN) return;

    const runs: Run[] = [];
    for (let y = yMin; y <= yMax; y += STEP) {
      let l = -Infinity;
      let r = Infinity;
      for (const b of boxes) {
        if (y < b.minY || y > b.maxY) continue;
        if (Math.abs(b.maxX - band.x0) < EDGE_TOL && b.maxX > l) l = b.maxX;
        if (Math.abs(b.minX - band.x1) < EDGE_TOL && b.minX < r) r = b.minX;
      }
      if (!Number.isFinite(l) || !Number.isFinite(r) || r - l < MIN_WIDTH) continue;
      // Push edges inward past any plot corner poking into the strip.
      while (l < r && (inObstacle(l + 4, y + 5) || inObstacle(l + 4, y + STEP - 5)))
        l += 6;
      while (r > l && (inObstacle(r - 4, y + 5) || inObstacle(r - 4, y + STEP - 5)))
        r -= 6;
      if (r - l >= MIN_WIDTH) runs.push({ a: y, b: y + STEP, lo: l, hi: r });
    }

    const polygons: Point[][] = [];
    const centerLines: Point[][] = [];
    mergeRuns(
      runs,
      (run) => [
        { x: run.lo, y: run.a },
        { x: run.hi, y: run.a },
        { x: run.hi, y: run.b },
        { x: run.lo, y: run.b },
      ],
      (run) => [
        { x: (run.lo + run.hi) / 2, y: run.a },
        { x: (run.lo + run.hi) / 2, y: run.b },
      ],
      polygons,
      centerLines
    );
    const total = polygons.reduce((s, poly) => s + (poly[2].y - poly[0].y), 0);
    if (total < MIN_RUN) return;
    roads.push({ id, polygons, centerLines });
  });

  // --- horizontal corridors: scan columns, flankers above/below ---
  HORIZONTAL_BANDS.forEach((band, id) => {
    const idOffset = 100 + id;
    let xMin = Infinity;
    let xMax = -Infinity;
    for (const b of boxes) {
      if (
        Math.abs(b.maxY - band.y0) < EDGE_TOL ||
        Math.abs(b.minY - band.y1) < EDGE_TOL
      ) {
        xMin = Math.min(xMin, b.minX);
        xMax = Math.max(xMax, b.maxX);
      }
    }
    if (!Number.isFinite(xMin) || xMax - xMin < MIN_RUN) return;

    const runs: Run[] = [];
    for (let x = xMin; x <= xMax; x += STEP) {
      let t = -Infinity;
      let bo = Infinity;
      for (const b of boxes) {
        if (x < b.minX || x > b.maxX) continue;
        if (Math.abs(b.maxY - band.y0) < EDGE_TOL && b.maxY > t) t = b.maxY;
        if (Math.abs(b.minY - band.y1) < EDGE_TOL && b.minY < bo) bo = b.minY;
      }
      if (!Number.isFinite(t) || !Number.isFinite(bo) || bo - t < MIN_WIDTH) continue;
      while (t < bo && (inObstacle(x + 5, t + 4) || inObstacle(x + STEP - 5, t + 4)))
        t += 6;
      while (bo > t && (inObstacle(x + 5, bo - 4) || inObstacle(x + STEP - 5, bo - 4)))
        bo -= 6;
      if (bo - t >= MIN_WIDTH) runs.push({ a: x, b: x + STEP, lo: t, hi: bo });
    }

    const polygons: Point[][] = [];
    const centerLines: Point[][] = [];
    mergeRuns(
      runs,
      (run) => [
        { x: run.a, y: run.lo },
        { x: run.a, y: run.hi },
        { x: run.b, y: run.hi },
        { x: run.b, y: run.lo },
      ],
      (run) => [
        { x: run.a, y: (run.lo + run.hi) / 2 },
        { x: run.b, y: (run.lo + run.hi) / 2 },
      ],
      polygons,
      centerLines
    );
    const total = polygons.reduce((s, poly) => s + (poly[3].x - poly[0].x), 0);
    if (total < MIN_RUN) return;
    roads.push({ id: idOffset, polygons, centerLines });
  });

  cache.set(key, roads);
  return roads;
}

/** Flat list of all corridor polygons (convenience for collision checks). */
export function addedRoadPolygons(): Point[][] {
  return addedRoads().flatMap((r) => r.polygons);
}
