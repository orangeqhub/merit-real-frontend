import React from "react";
import { Point } from "../../types/dxf";
import { getRegionData } from "../../layouts";
import { RegionInfo } from "./RegionLayer";

interface RegionPolygon {
  polygon: Point[];
  area: number;
}

interface LabeledRegion extends RegionPolygon {
  text: string;
  acText: string;
}

interface RegionData {
  utilities: LabeledRegion[];
}

const FILL_UTILITY = "#9C27B0";

const STROKE = "#000000";
const STROKE_WIDTH = 0.5;

interface Props {
  convert: (p: Point) => Point;
  onRegionHover?: (
    region: RegionInfo | null,
    clientX: number,
    clientY: number
  ) => void;
}

const UtilitiesLayer: React.FC<Props> = ({ convert, onRegionHover }) => {
  const data = getRegionData() as unknown as RegionData;
  return (
    <g id="utility-fills">
      {data.utilities.map((ut, index) => (
        <polygon
          key={`ut-${index}`}
          points={ut.polygon.map((p) => `${convert(p).x},${convert(p).y}`).join(" ")}
          fill={FILL_UTILITY}
          cursor="pointer"
          onMouseMove={(e) => {
            e.stopPropagation();
            onRegionHover?.({ text: ut.text, acText: ut.acText }, e.clientX, e.clientY);
          }}
          onMouseLeave={() => {
            onRegionHover?.(null, 0, 0);
          }}
          stroke={STROKE}
          strokeWidth={STROKE_WIDTH}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
};

export default React.memo(UtilitiesLayer);
