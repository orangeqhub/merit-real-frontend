import React, { useMemo } from "react";
import { Point } from "../../types/dxf";
import { getRegionData } from "../../layouts";
import { isCrossLineRoad, crossLinePlotId } from "../../utils/crossLineRoads";
import { RegionInfo } from "./RegionLayer";
import roadClassificationJson from "../../layouts/sri-lakshmi/roadClassification.json";

export type RoadClass = "highway" | "major-road" | "minor-road";

interface RoadClassificationEntry {
  id: string;
  type: RoadClass;
  widthClass: "40ft" | "30ft" | "highway";
  nearestLabel: string;
}

// Reference-derived classification only: each corridor is matched to the
// nearest printed road-width label from the source layout image
// (roadLabels in regionData.json — "30 FEET PRO. WIDE ROAD" / "40 FEET PRO.
// WIDE ROAD" / "NATIONAL HIGHWAY ROAD"). This is NOT official survey data,
// just the best available reading of what the reference drawing shows.
const roadClassification = roadClassificationJson as unknown as RoadClassificationEntry[];
const classificationById = new Map(roadClassification.map((c) => [c.id, c]));

interface RegionPolygon {
  polygon: Point[];
  area: number;
  id?: string;
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

// Subtle asphalt greys so plots/labels stay the visual focus (roads are
// vector fills, not an image — see RoadMarkingsLayer for the dashed
// center-line/edge-line dressing drawn on top of these). Hierarchy is kept
// deliberately understated: a slightly lighter fill + heavier casing for
// wider roads, and a warm amber casing reserved for the highway, echoing
// standard road-cartography convention without turning the map into a
// road atlas.
const FILL_MINOR = "#3f4652"; // 30ft roads
const FILL_MAJOR = "#4b5563"; // 40ft roads
const FILL_HIGHWAY = "#4a4238"; // national highway
const FILL_PLOT = "#22C55E";
const FILL_OPACITY = 1;

const STROKE_MINOR = "#2a2f38";
const STROKE_MAJOR = "#232830";
const STROKE_HIGHWAY = "#c9822a"; // amber casing, standard highway cue
const STROKE_WIDTH_MINOR = 0.5;
const STROKE_WIDTH_MAJOR = 0.7;
const STROKE_WIDTH_HIGHWAY = 1.6;

function roadStyle(roadClass: RoadClass | undefined) {
  switch (roadClass) {
    case "highway":
      return { fill: FILL_HIGHWAY, stroke: STROKE_HIGHWAY, strokeWidth: STROKE_WIDTH_HIGHWAY };
    case "major-road":
      return { fill: FILL_MAJOR, stroke: STROKE_MAJOR, strokeWidth: STROKE_WIDTH_MAJOR };
    case "minor-road":
    default:
      return { fill: FILL_MINOR, stroke: STROKE_MINOR, strokeWidth: STROKE_WIDTH_MINOR };
  }
}

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
        const classification = road.id ? classificationById.get(road.id) : undefined;
        const style = roadStyle(classification?.type);
        const baseFill = crossLine ? FILL_PLOT : style.fill;

        return (
          <g key={road.id ?? `road-${index}`}>
            <polygon
              points={road.polygon.map((p) => `${convert(p).x},${convert(p).y}`).join(" ")}
              fill={baseFill}
              fillOpacity={FILL_OPACITY}
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
              stroke={crossLine ? STROKE_MINOR : style.stroke}
              strokeWidth={crossLine ? STROKE_WIDTH_MINOR : style.strokeWidth}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
    </g>
  );
};

export default React.memo(RoadLayer);
