import React from "react";
import { Point } from "../../types/dxf";

interface Props {
  convert: (p: Point) => Point;
  scale: number;
  boundary: Point[] | null;
}

const STROKE_LANDSCAPE = "#6b8e23"; // olive green, matches the reference's margin planting
// World-unit width of the reference's landscaping margin (~25px at the
// digitizing scale, e.g. the highway-facing strip beside plot 1). Drawn as
// a stroke centered on the traced property edge, so only the outward half
// is visible once roads/plots (painted after this layer) cover the inward
// half — this avoids needing a true polygon-offset/buffer.
const MARGIN_WORLD = 120;

/**
 * Decorative landscaping margin along the property's outer edge (the olive
 * green planted strip with palm trees visible in the reference along the
 * highway, the top edge, and the east edge). Purely visual — plays no part
 * in GIS containment/search logic (see layoutBoundary.json for that).
 */
const BoundaryLandscapingLayer: React.FC<Props> = ({ convert, scale, boundary }) => {
  if (!boundary || boundary.length < 3) return null;
  const points = boundary.map((p) => convert(p));
  return (
    <polygon
      points={points.map((p) => `${p.x},${p.y}`).join(" ")}
      fill="none"
      stroke={STROKE_LANDSCAPE}
      strokeWidth={MARGIN_WORLD * scale}
      strokeLinejoin="bevel"
    />
  );
};

export default React.memo(BoundaryLandscapingLayer);
