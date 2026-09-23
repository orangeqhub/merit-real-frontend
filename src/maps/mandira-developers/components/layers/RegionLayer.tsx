import { useState, type FC } from "react";
import type { Point } from "../../types/dxf";
import { getOpenSpaces, getUtilities } from "../../layouts";
import { polygonAreaSqYd } from "../../utils/geometry";
import type { FeatureInfo } from "../FeatureTooltip";

interface Props {
  convert: (p: Point) => Point;
  onHover: (feature: FeatureInfo | null, x: number, y: number) => void;
}

const RegionLayer: FC<Props> = ({ convert, onHover }) => {
  const openSpaces = getOpenSpaces();
  const utilities = getUtilities();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const renderRegion = (
    r: { id: string; label: string; polygon: Point[] },
    fill: string,
    kind: FeatureInfo["kind"]
  ) => {
    const pts = r.polygon.map((p) => convert(p));
    const centerX = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const centerY = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const isHovered = hoveredId === r.id;
    return (
      <g key={r.id}>
        <polygon
          points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
          fill={fill}
          fillOpacity={isHovered ? 1 : 0.9}
          stroke={isHovered ? "#fbbf24" : "#1f2937"}
          strokeWidth={isHovered ? 1.5 : 0.5}
          cursor="pointer"
          onMouseEnter={(e) => {
            setHoveredId(r.id);
            onHover(
              { kind, label: r.label, areaSqYd: polygonAreaSqYd(r.polygon) },
              e.clientX,
              e.clientY
            );
          }}
          onMouseMove={(e) => {
            onHover(
              { kind, label: r.label, areaSqYd: polygonAreaSqYd(r.polygon) },
              e.clientX,
              e.clientY
            );
          }}
          onMouseLeave={() => {
            setHoveredId((cur) => (cur === r.id ? null : cur));
            onHover(null, 0, 0);
          }}
        />
        <text
          x={centerX}
          y={centerY}
          fontSize={8}
          textAnchor="middle"
          fill="#ffffff"
          fontWeight={600}
          pointerEvents="none"
        >
          {r.label}
        </text>
      </g>
    );
  };

  return (
    <g>
      {/* Open-space type: dark green (per map-mandira-developers request).
          Distinct from plot green #22C55E on the dark canvas. */}
      {openSpaces.map((r) => renderRegion(r, "#2E7D32", "Open Space"))}
      {utilities.map((r) => renderRegion(r, "#9C27B0", "Utility"))}
    </g>
  );
};

export default RegionLayer;
