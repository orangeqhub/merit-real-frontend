import { useState, type FC, type MouseEvent as ReactMouseEvent } from "react";
import type { Point } from "../../types/dxf";
import { getOpenSpaces, getUtilities } from "../../layouts";

interface Props {
  convert: (p: Point) => Point;
  onHover?: (info: { label: string; x: number; y: number } | null) => void;
}

const RegionLayer: FC<Props> = ({ convert, onHover }) => {
  const openSpaces = getOpenSpaces();
  const utilities = getUtilities();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const renderRegion = (r: { id: string; label: string; polygon: Point[] }, fill: string) => {
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
          onMouseEnter={(e: ReactMouseEvent) => {
            setHoveredId(r.id);
            onHover?.({ label: r.label, x: e.clientX, y: e.clientY });
          }}
          onMouseMove={(e: ReactMouseEvent) => {
            onHover?.({ label: r.label, x: e.clientX, y: e.clientY });
          }}
          onMouseLeave={() => {
            setHoveredId((cur) => (cur === r.id ? null : cur));
            onHover?.(null);
          }}
        />
        <text
          x={centerX}
          y={centerY}
          fontSize={7}
          textAnchor="middle"
          fill="#0f172a"
          pointerEvents="none"
        >
          {r.label}
        </text>
      </g>
    );
  };

  return (
    <g>
      {/* Dark green open space / purple utilities, matching
          merit-map-layout-main's reference region colors. */}
      {openSpaces.map((r) => renderRegion(r, "#2E7D32"))}
      {utilities.map((r) => renderRegion(r, "#9C27B0"))}
    </g>
  );
};

export default RegionLayer;
