import type { FC, MouseEvent as ReactMouseEvent } from "react";
import type { Point } from "../../types/dxf";
import { getOpenSpaces, getUtilities, getApplicantArea } from "../../layouts";

interface Props {
  convert: (p: Point) => Point;
  hoveredId: string | null;
  onHover: (id: string, title: string, lines: string[], e: ReactMouseEvent) => void;
  onMove: (e: ReactMouseEvent) => void;
  onLeave: (id: string) => void;
}

const RegionLayer: FC<Props> = ({ convert, hoveredId, onHover, onMove, onLeave }) => {
  const openSpaces = getOpenSpaces();
  const utilities = getUtilities();
  const applicantArea = getApplicantArea();

  const renderRegion = (
    r: { id: string; label: string; polygon: Point[] },
    fill: string,
    kind: string
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
          onMouseEnter={(e) => onHover(r.id, r.label, [kind], e)}
          onMouseMove={onMove}
          onMouseLeave={() => onLeave(r.id)}
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
      {/* Dark green open spaces / purple utilities, matching the color
          system established across the other Merit interactive layouts. */}
      {openSpaces.map((r) => renderRegion(r, "#2E7D32", "Open Space"))}
      {utilities.map((r) => renderRegion(r, "#9C27B0", "Utility"))}
      {/* Applicant Area -- a separate, non-plot parcel printed on the
          source next to plots 1-4. Not Open Space, not a sale plot, so it
          gets its own neutral tone rather than reusing either color. */}
      {applicantArea.map((r) => renderRegion(r, "#78716C", "Applicant Area"))}
    </g>
  );
};

export default RegionLayer;
