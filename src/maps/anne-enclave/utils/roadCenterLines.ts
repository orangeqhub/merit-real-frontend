import { Point } from "../types/dxf";
import { getRegionData, getActiveLayoutKey } from "../layouts";

interface RegionPolygon {
  polygon: Point[];
  area: number;
}

interface RegionData {
  roads: RegionPolygon[];
}

const regionDataOf = (): RegionData =>
  getRegionData() as unknown as RegionData;

function convexHull(points: Point[]): Point[] {
  const pts = points
    .slice()
    .sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Point[] = [];
  for (const p of pts) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

interface MinAreaRect {
  cx: number;
  cy: number;
  angle: number;
  length: number;
  width: number;
  axisW: number;
  axisH: number;
}

function minAreaRect(points: Point[]): MinAreaRect | null {
  const hull = convexHull(points);
  const n = hull.length;
  let best = Number.POSITIVE_INFINITY;
  let bestRect: MinAreaRect | null = null;

  for (let i = 0; i < n; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % n];
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const p of hull) {
      const x = p.x * cos + p.y * sin;
      const y = -p.x * sin + p.y * cos;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    const rectW = maxX - minX;
    const rectH = maxY - minY;
    const area = rectW * rectH;
    if (area < best) {
      best = area;
      const mx = (minX + maxX) / 2;
      const my = (minY + maxY) / 2;
      bestRect = {
        cx: mx * cos - my * sin,
        cy: mx * sin + my * cos,
        angle,
        length: Math.max(rectW, rectH),
        width: Math.min(rectW, rectH),
        axisW: rectW,
        axisH: rectH,
      };
    }
  }
  return bestRect;
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

function insideAny(x: number, y: number, mem: Strip[]): boolean {
  for (const m of mem) {
    const b = m.polygon;
    if (x < m.minX || x > m.maxX || y < m.minY || y > m.maxY) continue;
    if (pointInPolygon(x, y, b)) return true;
  }
  return false;
}

export interface RoadCenterLine {
  points: Point[];
}

interface Strip {
  index: number;
  polygon: Point[];
  ax: number;
  cx: number;
  cy: number;
  length: number;
  width: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const MERGE_GAP = 60;
const ANGLE_TOL = (12 * Math.PI) / 180;
const ALONG_GAP = 60;
const SAMPLE_STEP = 15;
const LAT_STEP = 5;
const RUN_MIN_LEN = 120;

function angDiff(a: number, b: number): number {
  let d = Math.abs(a - b);
  if (d > Math.PI / 2) d = Math.PI - d;
  return d;
}

interface Proj {
  along0: number;
  along1: number;
  lat0: number;
  lat1: number;
}

function project(strip: Strip, ax: number): Proj {
  const ux = Math.cos(ax);
  const uy = Math.sin(ax);
  const vx = -uy;
  const vy = ux;
  const along = strip.cx * ux + strip.cy * uy;
  const lat = strip.cx * vx + strip.cy * vy;
  return {
    along0: along - strip.length / 2,
    along1: along + strip.length / 2,
    lat0: lat - strip.width / 2,
    lat1: lat + strip.width / 2,
  };
}

function buildStrips(): (Strip | null)[] {
  return regionDataOf()
    .roads.map((road, index) => {
    const rect = minAreaRect(road.polygon);
    if (!rect || rect.width <= 0 || rect.length <= 0) return null;

    const longAlongAxis = rect.axisW >= rect.axisH;
    let ax = rect.angle;
    if (!longAlongAxis) ax += Math.PI / 2;
    ax = Math.atan2(Math.sin(ax), Math.cos(ax));
    if (ax > Math.PI / 2) ax -= Math.PI;
    if (ax < -Math.PI / 2) ax += Math.PI;

    return {
      index,
      polygon: road.polygon,
      ax,
      cx: rect.cx,
      cy: rect.cy,
      length: rect.length,
      width: rect.width,
      minX: Math.min(...road.polygon.map((p) => p.x)),
      minY: Math.min(...road.polygon.map((p) => p.y)),
      maxX: Math.max(...road.polygon.map((p) => p.x)),
      maxY: Math.max(...road.polygon.map((p) => p.y)),
    };
  });
}

function mergePair(a: Strip, b: Strip): boolean {
  if (angDiff(a.ax, b.ax) > ANGLE_TOL) return false;
  const axx = Math.cos(a.ax);
  const ayy = Math.sin(a.ax);
  let bx = Math.cos(b.ax);
  let by = Math.sin(b.ax);
  if (axx * bx + ayy * by < 0) {
    bx = -bx;
    by = -by;
  }
  const am = Math.atan2(ayy + by, axx + bx);
  const ux = Math.cos(am);
  const uy = Math.sin(am);
  const vx = -uy;
  const vy = ux;

  const sep = Math.abs((b.cx - a.cx) * vx + (b.cy - a.cy) * vy);
  if (sep - (a.width + b.width) / 2 > MERGE_GAP) return false;

  const aAlong = a.cx * ux + a.cy * uy;
  const bAlong = b.cx * ux + b.cy * uy;
  const alongOverlap =
    Math.min(aAlong + a.length / 2, bAlong + b.length / 2) -
    Math.max(aAlong - a.length / 2, bAlong - b.length / 2);
  return alongOverlap >= -ALONG_GAP;
}

function clusterStrips(strips: (Strip | null)[]): number[][] {
  const groups: number[][] = [];
  const used = new Array(strips.length).fill(false);

  for (let i = 0; i < strips.length; i++) {
    if (used[i] || !strips[i]) continue;
    const group: number[] = [i];
    used[i] = true;
    let grew = true;

    while (grew) {
      grew = false;
      for (let j = 0; j < strips.length; j++) {
        if (used[j] || !strips[j]) continue;
        for (const k of group) {
          const a = strips[k] as Strip;
          const b = strips[j] as Strip;
          if (mergePair(a, b)) {
            group.push(j);
            used[j] = true;
            grew = true;
            break;
          }
        }
        if (grew) break;
      }
    }
    groups.push(group);
  }
  return groups;
}

function computeGroupCenterLine(
  ids: number[],
  strips: (Strip | null)[]
): RoadCenterLine | null {
  const mem = ids.map((id) => strips[id] as Strip);

  let sinSum = 0;
  let cosSum = 0;
  for (const m of mem) {
    sinSum += Math.sin(2 * m.ax);
    cosSum += Math.cos(2 * m.ax);
  }
  let ax = 0.5 * Math.atan2(sinSum, cosSum);
  if (ax > Math.PI / 2) ax -= Math.PI;
  if (ax < -Math.PI / 2) ax += Math.PI;

  const projs = mem.map((m) => project(m, ax));
  const alongMin = Math.min(...projs.map((p) => p.along0));
  const alongMax = Math.max(...projs.map((p) => p.along1));

  const refX = mem.reduce((s, m) => s + m.cx, 0) / mem.length;
  const refY = mem.reduce((s, m) => s + m.cy, 0) / mem.length;

  const ux = Math.cos(ax);
  const uy = Math.sin(ax);
  const vx = -uy;
  const vy = ux;
  const refAlong = refX * ux + refY * uy;
  const refLat = refX * vx + refY * vy;

  const pts: Point[] = [];
  for (let t = alongMin - 40; t <= alongMax + 40; t += SAMPLE_STEP) {
    let envLo = Number.POSITIVE_INFINITY;
    let envHi = Number.NEGATIVE_INFINITY;
    let any = false;
    for (let i = 0; i < projs.length; i++) {
      const p = projs[i];
      if (t < p.along0 || t > p.along1) continue;
      any = true;
      if (p.lat0 < envLo) envLo = p.lat0;
      if (p.lat1 > envHi) envHi = p.lat1;
    }
    if (!any) continue;

    let lo = Number.POSITIVE_INFINITY;
    let hi = Number.NEGATIVE_INFINITY;
    let found = false;
    for (let lat = envLo - 30; lat <= envHi + 30; lat += LAT_STEP) {
      const x = refX + (t - refAlong) * ux + (lat - refLat) * vx;
      const y = refY + (t - refAlong) * uy + (lat - refLat) * vy;
      if (insideAny(x, y, mem)) {
        found = true;
        if (lat < lo) lo = lat;
        if (lat > hi) hi = lat;
      }
    }
    if (!found) continue;

    const latC = (lo + hi) / 2;
    pts.push({
      x: refX + (t - refAlong) * ux + (latC - refLat) * vx,
      y: refY + (t - refAlong) * uy + (latC - refLat) * vy,
    });
  }

  if (pts.length < 2) return null;

  const runs: Point[][] = [];
  let current: Point[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (
      Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) >
      SAMPLE_STEP * 2.5
    ) {
      runs.push(current);
      current = [pts[i]];
    } else {
      current.push(pts[i]);
    }
  }
  runs.push(current);

  let longest = runs[0];
  for (const run of runs) {
    if (run.length > longest.length) longest = run;
  }

  const runLen = Math.hypot(
    longest[longest.length - 1].x - longest[0].x,
    longest[longest.length - 1].y - longest[0].y
  );
  if (runLen < RUN_MIN_LEN) return null;

  const dedup: Point[] = [longest[0]];
  for (let i = 1; i < longest.length - 1; i++) {
    const first = dedup[0];
    const lastPt = longest[longest.length - 1];
    const lineX = lastPt.x - first.x;
    const lineY = lastPt.y - first.y;
    const len2 = lineX * lineX + lineY * lineY || 1;
    const t = ((longest[i].x - first.x) * lineX + (longest[i].y - first.y) * lineY) / len2;
    const projX = first.x + t * lineX;
    const projY = first.y + t * lineY;
    if (Math.hypot(longest[i].x - projX, longest[i].y - projY) > 15) {
      dedup.push(longest[i]);
    }
  }
  const last = longest[longest.length - 1];
  if (
    Math.hypot(last.x - dedup[dedup.length - 1].x, last.y - dedup[dedup.length - 1].y) >
    0.01
  ) {
    dedup.push(last);
  }

  return { points: dedup };
}

const cache = new Map<string, RoadCenterLine[]>();

export function roadCenterLines(): RoadCenterLine[] {
  const key = getActiveLayoutKey();
  const hit = cache.get(key);
  if (hit) return hit;

  const strips = buildStrips();
  const groups = clusterStrips(strips);
  const result = groups
    .map((group) => computeGroupCenterLine(group, strips))
    .filter((line): line is RoadCenterLine => line !== null);
  cache.set(key, result);

  return result;
}
