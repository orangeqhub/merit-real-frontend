import React, { useMemo } from "react";
import { Point } from "../../types/dxf";
import { getRegionData } from "../../layouts";
import { isCrossLineRoad, crossLinePlotId } from "../../utils/crossLineRoads";
import { RegionInfo } from "./RegionLayer";

interface RegionPolygon {
  polygon: Point[];
  area: number;
}

interface RoadLabel {
  text: string;
  x: number;
  y: number;
  snapped: Point | null;
  angle: number;
  width: number;
  length: number;
}

interface RegionData {
  roads: RegionPolygon[];
  roadLabels: RoadLabel[];
}

const regionDataOf = (): RegionData => getRegionData() as unknown as RegionData;

function polygonCentroid(polygon: Point[]): Point {
  let area = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const cross = polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
    area += cross;
    cx += (polygon[i].x + polygon[j].x) * cross;
    cy += (polygon[i].y + polygon[j].y) * cross;
  }

  area *= 0.5;
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

function roadWidthMeters(text: string): number | null {
  const match = /(\d+(?:\.\d+)?)\s*(?:metres|meters|mtrs|m)\w*/i.exec(text);
  return match ? parseFloat(match[1]) : null;
}

function buildRoadHoverInfo(data: RegionData): RegionInfo[] {
  const labelPositions = data.roadLabels.map(
    (label) => label.snapped ?? { x: label.x, y: label.y }
  );

  return data.roads.map((road, index) => {
    const center = polygonCentroid(road.polygon);

    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < labelPositions.length; i++) {
      const distance = Math.hypot(
        labelPositions[i].x - center.x,
        labelPositions[i].y - center.y
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }

    if (bestIndex < 0) {
      return { text: "Road", acText: "" };
    }

    const label = data.roadLabels[bestIndex];
    const nominal = roadWidthMeters(label.text);
    const scale = nominal && label.width > 0 ? nominal / label.width : null;
    const lengthInMeters = scale ? label.length * scale : null;

    return {
      text: label.text || "Road",
      acText: lengthInMeters
        ? `Length: ${
            lengthInMeters >= 1000
              ? `${(lengthInMeters / 1000).toFixed(2)} km`
              : `${Math.round(lengthInMeters)} m`
          }`
        : "",
    };
  });
}

const FILL_ROAD = "#3f3f46";
const FILL_PLOT = "#22C55E";

const STROKE = "#000000";
const STROKE_WIDTH = 0.5;

interface Props {
  convert: (p: Point) => Point;
  onRegionHover?: (
    region: RegionInfo | null,
    clientX: number,
    clientY: number
  ) => void;
  onCrossLineHover?: (
    plotId: string | null,
    clientX: number,
    clientY: number
  ) => void;
}

const RoadLayer: React.FC<Props> = ({
  convert,
  onRegionHover,
  onCrossLineHover,
}) => {
  const data = regionDataOf();
  const roadHoverInfo = useMemo(() => buildRoadHoverInfo(data), [data]);
  return (
    <g id="road-fills">
      {data.roads.map((road, index) => {
        const crossLine = isCrossLineRoad(index);
        const crossLinePlot = crossLinePlotId(index);
        const baseFill = crossLine ? FILL_PLOT : FILL_ROAD;

        return (
          <g key={`road-${index}`}>
            <polygon
              points={road.polygon.map((p) => `${convert(p).x},${convert(p).y}`).join(" ")}
              fill={baseFill}
              cursor="pointer"
              onMouseMove={(e) => {
                if (crossLine && crossLinePlot) {
                  e.stopPropagation();
                  onCrossLineHover?.(crossLinePlot, e.clientX, e.clientY);
                } else {
                  onRegionHover?.(roadHoverInfo[index], e.clientX, e.clientY);
                }
              }}
              onMouseLeave={() => {
                if (crossLine) {
                  onCrossLineHover?.(null, 0, 0);
                } else {
                  onRegionHover?.(null, 0, 0);
                }
              }}
              stroke={STROKE}
              strokeWidth={STROKE_WIDTH}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
    </g>
  );
};

export default React.memo(RoadLayer);
