import React from "react";
import { Point } from "../../types/dxf";

interface Props {
  convert: (p: Point) => Point;
  scale: number;
  box: { minX: number; minY: number; width: number; height: number };
  src: string;
  opacity?: number;
}

/**
 * Background image for image-based layouts (drawn first, under everything).
 * Image-based layouts are natively Y-down (box.minY is the top of the
 * photo, matching pixel-coordinate convention) and DxfCanvas's convert()
 * does not flip Y for them — so the box's own minY is already the correct
 * screen-space top-left, no Y-flip needed here.
 */
const ImageUnderlayLayer: React.FC<Props> = ({ convert, scale, box, src, opacity = 1 }) => {
  const topLeft = convert({
    x: box.minX,
    y: box.minY,
  });
  const width = box.width * scale;
  const height = box.height * scale;

  return (
    <g id="image-underlay">
      <image
        href={src}
        x={topLeft.x}
        y={topLeft.y}
        width={width}
        height={height}
        opacity={opacity}
        preserveAspectRatio="none"
        style={{ userSelect: "none", pointerEvents: "none" }}
      />
    </g>
  );
};

export default React.memo(ImageUnderlayLayer);