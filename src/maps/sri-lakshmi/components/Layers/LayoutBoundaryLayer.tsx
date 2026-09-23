import React from "react";
import { Point } from "../../types/dxf";
import type { BoundaryRect } from "../../layouts";

interface Props {
  convert: (p: Point) => Point;
  boundary: BoundaryRect[] | null;
  /** ?edit=1 QA aid: draw as a bright outline only (no fill) so it can be
   *  checked against the reference photo underlay instead of covering it. */
  outlineOnly?: boolean;
}

const STROKE_DEBUG = "#00e5ff";

/**
 * Outer layout footprint — kept as DATA (bounding rectangles used elsewhere
 * for GIS/containment logic) but intentionally NOT painted as a filled
 * ground plane in production. A rectangle-union fill here reads as a solid
 * grey block wherever a rectangle's coarse shape extends past the actual
 * plots/roads/open-space it was fitted around (e.g. the stepped boundary on
 * the east side, or any per-column padding), which has no counterpart in
 * the reference — the reference shows plain background there, not a grey
 * fill. Roads, plots and open spaces each paint their own area; anywhere
 * none of those cover is meant to render as the app's plain background, not
 * a synthesized "ground plane". Only ?edit=1 draws these rectangles at all,
 * as a bright debug outline for QA against the reference photo underlay.
 */
const LayoutBoundaryLayer: React.FC<Props> = ({ convert, boundary, outlineOnly }) => {
  if (!boundary || boundary.length === 0 || !outlineOnly) return null;

  return (
    <g id="layout-boundary">
      {boundary.map((r, i) => {
        const a = convert({ x: r.minX, y: r.minY });
        const b = convert({ x: r.maxX, y: r.maxY });
        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);
        const width = Math.abs(b.x - a.x);
        const height = Math.abs(b.y - a.y);
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={width}
            height={height}
            fill="none"
            stroke={STROKE_DEBUG}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </g>
  );
};

export default React.memo(LayoutBoundaryLayer);
