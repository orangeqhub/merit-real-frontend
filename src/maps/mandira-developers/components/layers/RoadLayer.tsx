import { useState, type FC } from "react";
import type { Point } from "../../types/dxf";
import { getRoads, getExistingRoads, getOuterRoad } from "../../layouts";
import { polygonAreaSqYd } from "../../utils/geometry";
import type { FeatureInfo } from "../FeatureTooltip";

interface Props {
  convert: (p: Point) => Point;
  onHover: (feature: FeatureInfo | null, x: number, y: number) => void;
}

// All grey, matching the color system established across the other Merit
// interactive layouts. The NH frontage and "Existing Road" keep their own
// text labels for identification instead of a distinct color.
const ROAD_COLORS: Record<string, string> = {
  "proposed-9m": "#94a3b8",
  "proposed-12m": "#64748b",
  "existing-nh": "#52525b",
  "existing-road": "#3f3f46",
  "outer-road": "#3f3f46",
};

interface RoadEntryLike {
  id: string;
  type: string;
  label?: string;
  polygon: Point[];
  crossLines?: { a: Point; b: Point }[];
}

// ---------------------------------------------------------------------------
// Explicit transverse road markings.
//
// Per the Mandira requirement, cross-markings are NOT algorithmically
// sprinkled over every road ("a generic cross-line every N pixels"). Instead
// each wanted marking is explicitly listed below against a road id. The line
// is then built from the actual road geometry: a cross-section perpendicular
// to the local road direction, clipped exactly to the two road edges (it can
// never extend into Open Space, plots, or the satellite background).
// ---------------------------------------------------------------------------

/** Roads that receive an explicit solid transverse marking. */
const REQUIRED_ROAD_CROSS_LINES: { roadId: string; centerY: number }[] = [
  // Required marking: across the diagonal "EXISTING ROAD" in its upper
  // section, where it approaches the NH 167 AG junction (upper-right).
  { roadId: "existing-road-diagonal", centerY: -20 },
];

const EPS = 1e-9;

/** Center of the polygon on the horizontal scanline `y`, or null when the
 *  scanline does not slice cleanly through the polygon (needs two sides). */
const centerAtY = (polygon: Point[], y: number): Point | null => {
  const xs: number[] = [];
  for (let i = 0, n = polygon.length; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];
    if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
      xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
    }
  }
  if (xs.length < 2) return null;
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  return { x: (lo + hi) / 2, y };
};

/** Parameters t where the line p + t*dir crosses the polygon boundary. */
const crossingsAlong = (polygon: Point[], p: Point, dir: Point): number[] => {
  const ts: number[] = [];
  for (let i = 0, n = polygon.length; i < n; i++) {
    const v0 = polygon[i];
    const v1 = polygon[(i + 1) % n];
    const ex = v1.x - v0.x;
    const ey = v1.y - v0.y;
    const denom = dir.x * ey - dir.y * ex; // cross(dir, edge)
    if (Math.abs(denom) < EPS) continue;
    const ox = v0.x - p.x;
    const oy = v0.y - p.y;
    const t = (ox * ey - oy * ex) / denom; // cross(v0-p, edge) / cross(dir, edge)
    const s = (ox * dir.y - oy * dir.x) / denom; // position along the edge
    if (s >= -EPS && s <= 1 + EPS) ts.push(t);
  }
  return ts;
};

/**
 * Build a transverse cross-line across `polygon` at `centerY`: perpendicular
 * to the local road direction, clipped exactly to the two road edges.
 * Returns world-coordinate endpoints, or null when the geometry is unusable.
 */
const roadCrossLine = (
  polygon: Point[],
  centerY: number,
  step = 150
): { a: Point; b: Point } | null => {
  const p = centerAtY(polygon, centerY);
  const hi = centerAtY(polygon, centerY + step);
  const lo = centerAtY(polygon, centerY - step);
  if (!p || !hi || !lo) return null;
  const tx = hi.x - lo.x;
  const ty = hi.y - lo.y;
  const len = Math.hypot(tx, ty);
  if (len < EPS) return null;
  const dir = { x: -ty / len, y: tx / len }; // perpendicular to the tangent
  const ts = crossingsAlong(polygon, p, dir);
  if (ts.length < 2) return null;
  const tMin = Math.min(...ts);
  const tMax = Math.max(...ts);
  return {
    a: { x: p.x + tMin * dir.x, y: p.y + tMin * dir.y },
    b: { x: p.x + tMax * dir.x, y: p.y + tMax * dir.y },
  };
};

const RoadLayer: FC<Props> = ({ convert, onHover }) => {
  const roads = getRoads();
  // "existing-road" (the crude single-quad approximation of the real
  // forked road) is intentionally excluded from rendering here now that
  // `outer` provides an accurate, multi-segment trace of the same real
  // feature -- rendering both overlapped confusingly. The underlying
  // existingRoads.json data is left completely untouched (still contains
  // that entry) per this task's "don't modify existing road geometry"
  // requirement; this is a display-only filter.
  const existing: RoadEntryLike[] = getExistingRoads().filter(
    (r) => r.type !== "existing-road"
  );
  const outer: RoadEntryLike[] = getOuterRoad();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const renderRoadLabel = (r: RoadEntryLike) => {
    if (!r.label) return null;
    const pts = r.polygon.map(convert);
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    return (
      <text
        key={`${r.id}-label`}
        x={cx}
        y={cy}
        fontSize={9}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#ffffff"
        fontWeight={600}
        pointerEvents="none"
      >
        {r.label}
      </text>
    );
  };

  // Thin dashed centerline "road markings" drawn along the middle of each
  // road, following the road's own run direction (horizontal stripe for
  // east-west roads, vertical stripe for north-south roads). Centerlines
  // only -- no generic cross-bars. The single explicitly-required junction
  // cross-marking is rendered separately from REQUIRED_ROAD_CROSS_LINES
  // below (selective, not per-road).
  const renderMarking = (r: RoadEntryLike) => {
    const pts = r.polygon.map(convert);
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxY = Math.max(...pts.map((p) => p.y));
    const wide = maxX - minX >= maxY - minY;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const [x1, y1, x2, y2] = wide
      ? [minX + 4, cy, maxX - 4, cy]
      : [cx, minY + 4, cx, maxY - 4];
    return (
      <line
        key={`${r.id}-marking`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#e8edf2"
        strokeOpacity={0.9}
        strokeWidth={1.6}
        strokeDasharray="6 5"
        pointerEvents="none"
      />
    );
  };

  const renderRoad = (r: RoadEntryLike, fallbackFill: string) => {
    const isHovered = hoveredId === r.id;
    const label = r.label ?? r.type;
    return (
      <polygon
        key={r.id}
        points={r.polygon.map((p) => convert(p)).map((p) => `${p.x},${p.y}`).join(" ")}
        fill={ROAD_COLORS[r.type] ?? fallbackFill}
        fillOpacity={isHovered ? 1 : 0.9}
        stroke={isHovered ? "#fbbf24" : "#1f2937"}
        strokeWidth={isHovered ? 1.5 : 0.5}
        cursor="pointer"
        onMouseEnter={(e) => {
          setHoveredId(r.id);
          onHover({ kind: "Road", label, areaSqYd: polygonAreaSqYd(r.polygon) }, e.clientX, e.clientY);
        }}
        onMouseMove={(e) => {
          onHover({ kind: "Road", label, areaSqYd: polygonAreaSqYd(r.polygon) }, e.clientX, e.clientY);
        }}
        onMouseLeave={() => {
          setHoveredId((cur) => (cur === r.id ? null : cur));
          onHover(null, 0, 0);
        }}
      />
    );
  };

  return (
    <g>
      {/* Outer/perimeter road (the real forked "Existing Road" shape) is
          drawn first, so internal proposed roads and plots paint over it
          at any incidental overlap, per the requested layer order. */}
      {outer.map((r) => renderRoad(r, "#3f3f46"))}
      {roads.map((r) => renderRoad(r, "#94a3b8"))}
      {existing.map((r) => renderRoad(r, "#52525b"))}
      {outer.map(renderMarking)}
      {roads.map(renderMarking)}
      {existing.map(renderMarking)}
      {/* Explicit transverse cross-markings -- only the segments listed in
          REQUIRED_ROAD_CROSS_LINES render a solid transverse line (nothing
          generic per-road). Each is perpendicular to the local road direction
          and clipped exactly to the road's two edges. */}
      {REQUIRED_ROAD_CROSS_LINES.map((cfg) => {
        const road = outer.find((r) => r.id === cfg.roadId);
        if (!road) return null;
        const seg = roadCrossLine(road.polygon, cfg.centerY);
        if (!seg) return null;
        const a = convert(seg.a);
        const b = convert(seg.b);
        return (
          <line
            key={`required-cross-${cfg.roadId}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="#e8edf2"
            strokeOpacity={0.95}
            strokeWidth={2}
            pointerEvents="none"
          />
        );
      })}
      {existing.map(renderRoadLabel)}
      {outer.map(renderRoadLabel)}
    </g>
  );
};

export default RoadLayer;
