import React from "react";
import { Point } from "../../types/dxf";

interface Props {
  convert: (p: Point) => Point;
  scale: number;
  box: { minX: number; minY: number; width: number; height: number };
  src: string;
}

/** Background image for image-based layouts (drawn first, under everything). */
const ImageUnderlayLayer: React.FC<Props> = ({ convert, scale, box, src }) => {
  const topLeft = convert({
    x: box.minX,
    y: box.minY + box.height,
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
        preserveAspectRatio="none"
        style={{ userSelect: "none", pointerEvents: "none" }}
      />
    </g>
  );
};

export default React.memo(ImageUnderlayLayer);