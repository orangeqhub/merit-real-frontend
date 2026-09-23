import React from "react";
import { Point } from "../../types/dxf";

interface Props {
  entities: any[];
  convert: (p: Point) => Point;
}

const LineLayer: React.FC<Props> = ({ entities, convert }) => {
  return (
    <>
      {entities.map((entity, index) => {
       
        const points = entity.vertices
          .map((v: Point) => {
            const p = convert(v);
            return `${p.x},${p.y}`;
          })
          .join(" ");

        if (entity.shape) {
          return (
            <polygon
              key={index}
              points={points}
              fill="none"
              stroke="#000000"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          );
        }

        return (
          <polyline
            key={index}
            points={points}
            fill="none"
            stroke="#000000"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </>
  );
};

export default React.memo(LineLayer);
