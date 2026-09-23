import React from "react";
import { Point } from "../../types/dxf";
import { addedRoads } from "../../utils/addedRoads";

interface Props {
  convert: (p: Point) => Point;
}

const FILL_ROAD = "#3f3f46";
const STROKE = "#000000";
const STROKE_WIDTH = 0.5;

/** Render-only road strips added between plot columns (see addedRoads.ts).
 *  Drawn with the exact same style as RoadLayer so they blend in. */
const AddedRoadsLayer: React.FC<Props> = ({ convert }) => {
  const roads = addedRoads();
  if (!roads.length) return null;
  return (
    <g id="added-roads">
      {roads.map((road) =>
        road.polygons.map((poly, i) => (
          <polygon
            key={`added-road-${road.id}-${i}`}
            points={poly.map((p) => `${convert(p).x},${convert(p).y}`).join(" ")}
            fill={FILL_ROAD}
            stroke={STROKE}
            strokeWidth={STROKE_WIDTH}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        ))
      )}
    </g>
  );
};

export default React.memo(AddedRoadsLayer);
