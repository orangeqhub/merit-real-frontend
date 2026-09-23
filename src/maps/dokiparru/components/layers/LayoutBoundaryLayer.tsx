import type { FC } from "react";
import type { Point } from "../../types/dxf";
import boundaryJson from "../../layouts/dokiparru/layoutBoundary.json";

interface Props {
  convert: (p: Point) => Point;
}

const boundary = boundaryJson as unknown as { polygon: Point[]; precision: string };

const LayoutBoundaryLayer: FC<Props> = ({ convert }) => {
  const pts = boundary.polygon.map((p) => convert(p));
  return (
    <polygon
      points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
      fill="none"
      stroke="#dc2626"
      strokeWidth={1.5}
      strokeDasharray="4 2"
      pointerEvents="none"
    />
  );
};

export default LayoutBoundaryLayer;
