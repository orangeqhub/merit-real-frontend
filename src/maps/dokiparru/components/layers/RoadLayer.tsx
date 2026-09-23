import { useState, type FC, type MouseEvent as ReactMouseEvent } from "react";
import type { Point } from "../../types/dxf";
import { getRoads, getExistingRoads } from "../../layouts";

interface Props {
  convert: (p: Point) => Point;
  onHover?: (info: { label: string; x: number; y: number } | null) => void;
}

/**
 * The road's own dashed centerline ("cross lines"), matching the white
 * dashed road-marking style used in the other Merit map layouts. Existing
 * roads (B.T./Donka) already carry a real traced centerline `path`, used
 * as-is. Proposed roads are plain quads (no `path`), so the centerline is
 * derived from the polygon itself: the two SHORTEST edges of a road quad
 * are its end caps (the road's width, perpendicular to its run), and the
 * two LONGEST edges run along its length -- so connecting the midpoints of
 * the two shortest edges gives the road's own run line without needing any
 * new geometry data.
 */
function quadCenterline(polygon: Point[]): [Point, Point] | null {
  if (polygon.length !== 4) return null;
  const edges = polygon.map((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    return { mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, len: Math.hypot(b.x - a.x, b.y - a.y) };
  });
  let shortest = 0;
  for (let i = 1; i < edges.length; i++) if (edges[i].len < edges[shortest].len) shortest = i;
  const opposite = (shortest + 2) % edges.length;
  return [edges[shortest].mid, edges[opposite].mid];
}

// All grey (matches merit-map-layout-main's reference road treatment).
// Existing B.T./Donka roads keep their own text labels for identification
// instead of a distinct color, so they no longer read as non-grey roads.
const ROAD_COLORS: Record<string, string> = {
  "proposed-33ft": "#94a3b8",
  "proposed-40ft": "#64748b",
  "proposed-60ft": "#475569",
  "existing-bt": "#52525b",
  "existing-donka": "#3f3f46",
};

interface RoadEntryLike {
  id: string;
  type: string;
  label?: string;
  polygon: Point[];
  path?: Point[];
}

// The road's overall run direction, used to angle the label text and place
// the two end labels along that same line. Uses the leftmost/rightmost
// vertices (by x) rather than a single edge, so it stays correct for both
// open centerline paths and closed filled polygons.
function longAxis(pts: Point[]) {
  let left = pts[0];
  let right = pts[0];
  for (const p of pts) {
    if (p.x < left.x) left = p;
    if (p.x > right.x) right = p;
  }
  const angle = (Math.atan2(right.y - left.y, right.x - left.x) * 180) / Math.PI;
  const cx = (left.x + right.x) / 2;
  const cy = (left.y + right.y) / 2;
  return { left, right, angle, cx, cy };
}

const RoadLayer: FC<Props> = ({ convert, onHover }) => {
  const roads = getRoads();
  const existing: RoadEntryLike[] = getExistingRoads();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const roadLabel = (r: RoadEntryLike) => r.label || (r.type ? r.type.replace(/-/g, " ") : "Road");

  const hoverHandlers = (r: RoadEntryLike) => ({
    onMouseEnter: (e: ReactMouseEvent) => {
      setHoveredId(r.id);
      onHover?.({ label: roadLabel(r), x: e.clientX, y: e.clientY });
    },
    onMouseMove: (e: ReactMouseEvent) => {
      onHover?.({ label: roadLabel(r), x: e.clientX, y: e.clientY });
    },
    onMouseLeave: () => {
      setHoveredId((cur) => (cur === r.id ? null : cur));
      onHover?.(null);
    },
  });

  const centerlineFor = (r: RoadEntryLike): Point[] | null => {
    if (r.path && r.path.length >= 2) return r.path;
    return quadCenterline(r.polygon);
  };

  const renderLabel = (r: RoadEntryLike) => {
    if (!r.label) return null;
    const axisPts = (r.path ?? r.polygon).map(convert);
    const { left, right } = longAxis(axisPts);
    // Center the label in the middle of the filled band (not on the
    // centerline path), so it sits visually inside the box like the
    // reference drawing, not pinned to one edge.
    const bandPts = r.polygon.map(convert);
    const cx = bandPts.reduce((s, p) => s + p.x, 0) / bandPts.length;
    const cy = bandPts.reduce((s, p) => s + p.y, 0) / bandPts.length;

    // Angle the text to match the LOCAL slope of the path segment under its
    // own x-position, not the road's overall end-to-end trend — a bent road
    // (like Donka's multi-segment centerline) has a different local angle
    // near its middle than the straight line between its two endpoints.
    const centerlinePts = (r.path ?? [left, right]).map(convert);
    let angle = 0;
    for (let i = 0; i < centerlinePts.length - 1; i++) {
      const a = centerlinePts[i];
      const b = centerlinePts[i + 1];
      const lo = Math.min(a.x, b.x);
      const hi = Math.max(a.x, b.x);
      if (cx >= lo && cx <= hi) {
        angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        break;
      }
    }

    const isBt = r.id === "existing-bt-road";

    const endLabel = (pos: Point, text: string, arrowDir: 1 | -1) => (
      <g transform={`translate(${pos.x}, ${pos.y}) rotate(${angle})`}>
        <text
          x={0}
          y={-6}
          fontSize={7}
          textAnchor="middle"
          fill="#f9a8d4"
          fontWeight={600}
          pointerEvents="none"
        >
          {text}
        </text>
        <line
          x1={-14}
          y1={4}
          x2={14}
          y2={4}
          stroke="#dc2626"
          strokeWidth={0.8}
          markerEnd="url(#road-arrow)"
          transform={arrowDir === -1 ? "scale(-1,1)" : undefined}
        />
      </g>
    );

    return (
      <g key={`${r.id}-label`}>
        <text
          x={cx}
          y={cy}
          fontSize={8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#ffffff"
          fontWeight={600}
          transform={`rotate(${angle}, ${cx}, ${cy})`}
          pointerEvents="none"
        >
          {r.label}
        </text>
        {isBt && endLabel(left, "TO PHIRANGIPURAM", -1)}
        {isBt && endLabel(right, "TO GUNTUR", 1)}
      </g>
    );
  };

  return (
    <g>
      <defs>
        <marker
          id="road-arrow"
          markerWidth={6}
          markerHeight={6}
          refX={5}
          refY={3}
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="#dc2626" />
        </marker>
      </defs>
      {roads.map((r) => {
        const isHovered = hoveredId === r.id;
        const centerline = centerlineFor(r);
        return (
          <g key={r.id}>
            <polygon
              points={r.polygon.map((p) => convert(p)).map((p) => `${p.x},${p.y}`).join(" ")}
              fill={ROAD_COLORS[r.type] ?? "#94a3b8"}
              fillOpacity={isHovered ? 1 : 0.9}
              stroke={isHovered ? "#fbbf24" : "#1f2937"}
              strokeWidth={isHovered ? 1.5 : 0.5}
              cursor="pointer"
              {...hoverHandlers(r)}
            />
            {centerline && (
              <polyline
                points={centerline.map((p) => convert(p)).map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="#ffffff"
                strokeWidth={1}
                strokeDasharray="6 5"
                opacity={0.75}
                pointerEvents="none"
              />
            )}
          </g>
        );
      })}
      {existing.map((r) => {
        const isHovered = hoveredId === r.id;
        const centerline = centerlineFor(r);
        const isTracedPath = r.path && r.id !== "existing-donka-road" && r.id !== "existing-bt-road";
        return (
          <g key={r.id}>
            {isTracedPath ? (
              <polyline
                points={r.path!.map((p) => convert(p)).map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={ROAD_COLORS[r.type] ?? "#94a3b8"}
                strokeWidth={isHovered ? 3 : 1.5}
                cursor="pointer"
                {...hoverHandlers(r)}
              />
            ) : (
              <polygon
                points={r.polygon.map((p) => convert(p)).map((p) => `${p.x},${p.y}`).join(" ")}
                fill={ROAD_COLORS[r.type] ?? "#94a3b8"}
                fillOpacity={isHovered ? 1 : 0.9}
                stroke={isHovered ? "#fbbf24" : "#1f2937"}
                strokeWidth={isHovered ? 1.5 : 0.5}
                cursor="pointer"
                {...hoverHandlers(r)}
              />
            )}
            {!isTracedPath && centerline && (
              <polyline
                points={centerline.map((p) => convert(p)).map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="#ffffff"
                strokeWidth={1}
                strokeDasharray="6 5"
                opacity={0.75}
                pointerEvents="none"
              />
            )}
          </g>
        );
      })}
      {existing.map(renderLabel)}
    </g>
  );
};

export default RoadLayer;
