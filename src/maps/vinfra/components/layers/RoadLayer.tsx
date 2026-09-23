import type { FC, MouseEvent as ReactMouseEvent } from "react";
import type { Point } from "../../types/dxf";
import { getRoads, getExistingRoads, getOuterRoad } from "../../layouts";

const ROAD_WIDTH_FT: Record<string, string> = {
  "proposed-30ft": "30 ft",
  "proposed-40ft": "40 ft",
};

interface Props {
  convert: (p: Point) => Point;
  hoveredId: string | null;
  onHover: (id: string, title: string, lines: string[], e: ReactMouseEvent) => void;
  onMove: (e: ReactMouseEvent) => void;
  onLeave: (id: string) => void;
}

// All grey, matching the color system established across the other Merit
// interactive layouts. The NH frontage and "Existing Road" keep their own
// text labels for identification instead of a distinct color.
const ROAD_COLORS: Record<string, string> = {
  "proposed-30ft": "#94a3b8",
  "proposed-40ft": "#64748b",
  "existing-road": "#52525b",
  "outer-road": "#3f3f46",
};

interface RoadEntryLike {
  id: string;
  type: string;
  label?: string;
  polygon: Point[];
  centerline?: Point[];
}

const RoadLayer: FC<Props> = ({ convert, hoveredId, onHover, onMove, onLeave }) => {
  const roads = getRoads();
  const existing: RoadEntryLike[] = getExistingRoads();
  const outer: RoadEntryLike[] = getOuterRoad();

  const roadLines = (r: RoadEntryLike) => {
    const width = ROAD_WIDTH_FT[r.type];
    return width ? [`Width: ${width}`] : [];
  };

  const renderRoadLabel = (r: RoadEntryLike) => {
    if (!r.label) return null;
    // The ORR band is built as [...outerEdge, ...innerEdge.reverse()] --
    // for a long diagonal band, the whole-polygon centroid can land near
    // its narrow (Applicant Area) end, overlapping plots 1-4's own
    // labels. Biasing to just the outer-edge half keeps the label
    // centered within the band itself instead.
    const srcPts = r.type === "outer-road" ? r.polygon.slice(0, r.polygon.length / 2) : r.polygon;
    const pts = srcPts.map(convert);
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

  // Thin dashed centerline "road markings" drawn on top of the road fill.
  // Roads with an explicit `centerline` (bent/curved shapes like the ORR)
  // render it as a multi-segment dashed polyline that follows the road's
  // real shape; plain rectangular roads fall back to a single line
  // derived from their own bounding box (a straight line through a
  // straight road is already correct, no need for the extra data).
  const renderMarking = (r: RoadEntryLike) => {
    if (r.centerline && r.centerline.length >= 2) {
      const pts = r.centerline.map(convert);
      return (
        <polyline
          key={`${r.id}-marking`}
          points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="#e8edf2"
          strokeOpacity={0.6}
          strokeWidth={1}
          strokeDasharray="6 5"
          pointerEvents="none"
        />
      );
    }
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
        strokeOpacity={0.6}
        strokeWidth={1}
        strokeDasharray="6 5"
        pointerEvents="none"
      />
    );
  };

  return (
    <g>
      {/* Outer/perimeter road (the real forked "Existing Road" shape) is
          drawn first, so internal proposed roads and plots paint over it
          at any incidental overlap, per the requested layer order. */}
      {outer.map((r) => (
        <polygon
          key={r.id}
          points={r.polygon.map((p) => convert(p)).map((p) => `${p.x},${p.y}`).join(" ")}
          fill={ROAD_COLORS[r.type] ?? "#3f3f46"}
          fillOpacity={hoveredId === r.id ? 1 : 0.9}
          stroke={hoveredId === r.id ? "#fbbf24" : "#1f2937"}
          strokeWidth={hoveredId === r.id ? 1.5 : 0.5}
          cursor="pointer"
          onMouseEnter={(e) => onHover(r.id, r.label ?? "Outer Ring Road", roadLines(r), e)}
          onMouseMove={onMove}
          onMouseLeave={() => onLeave(r.id)}
        />
      ))}
      {roads.map((r) => (
        <polygon
          key={r.id}
          points={r.polygon.map((p) => convert(p)).map((p) => `${p.x},${p.y}`).join(" ")}
          fill={ROAD_COLORS[r.type] ?? "#94a3b8"}
          fillOpacity={hoveredId === r.id ? 1 : 0.9}
          stroke={hoveredId === r.id ? "#fbbf24" : "#1f2937"}
          strokeWidth={hoveredId === r.id ? 1.5 : 0.5}
          cursor="pointer"
          onMouseEnter={(e) => onHover(r.id, r.label ?? "Proposed Road", roadLines(r), e)}
          onMouseMove={onMove}
          onMouseLeave={() => onLeave(r.id)}
        />
      ))}
      {existing.map((r) => (
        <polygon
          key={r.id}
          points={r.polygon.map((p) => convert(p)).map((p) => `${p.x},${p.y}`).join(" ")}
          fill={ROAD_COLORS[r.type] ?? "#52525b"}
          fillOpacity={hoveredId === r.id ? 1 : 0.9}
          stroke={hoveredId === r.id ? "#fbbf24" : "#1f2937"}
          strokeWidth={hoveredId === r.id ? 1.5 : 0.5}
          cursor="pointer"
          onMouseEnter={(e) => onHover(r.id, r.label ?? "Existing Road", roadLines(r), e)}
          onMouseMove={onMove}
          onMouseLeave={() => onLeave(r.id)}
          pointerEvents="none"
        />
      ))}
      {outer.map(renderMarking)}
      {roads.map(renderMarking)}
      {existing.map(renderMarking)}
      {existing.map(renderRoadLabel)}
      {outer.map(renderRoadLabel)}
    </g>
  );
};

export default RoadLayer;
