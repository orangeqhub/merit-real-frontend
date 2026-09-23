import React, { useMemo } from "react";
import { Point } from "../../types/dxf";
import { getRegionData, getActiveLayoutKey } from "../../layouts";
import { fitFontInBox } from "../../utils/geometry/TextFitter";
import {
  isInsidePhase1Boundary,
  type PhaseFilter,
} from "../../utils/plotPhases";

interface RegionPolygon {
  polygon: Point[];
  area: number;
}

interface LabeledRegion extends RegionPolygon {
  text: string;
  textPos: Point;
  acText: string;
  acPos: Point;
  bounds: { width: number; height: number };
}

interface RegionData {
  plots: RegionPolygon[];
  openSpaces: LabeledRegion[];
  utilities: LabeledRegion[];
  roadLabels: RoadLabel[];
  landmarks?: Landmark[];
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

/** Small fixed-position captions (TEMPLE, UTILITY area, passage width) that
 *  the reference prints near the west-cluster block — text only, no
 *  dedicated polygon, since no shape was requested for these. */
interface Landmark {
  text: string;
  x: number;
  y: number;
  angle: number;
}

const regionDataOf = (): RegionData =>
  getRegionData() as unknown as RegionData;

export interface RegionInfo {
  text: string;
  acText: string;
}

const FILL_OPEN = "#2E7D32";
const FILL_PLOT = "#22C55E";

const STROKE = "#000000";
const STROKE_WIDTH = 0.5;

const TITLE_BASE = 60;
const TITLE_MIN = 16;
const TITLE_MAX = 34;

interface Props {
  convert: (p: Point) => Point;
  scale: number;
  zoom: number;
  mode: "fills" | "labels";
  phase?: PhaseFilter;
  onRegionHover?: (
    region: RegionInfo | null,
    clientX: number,
    clientY: number
  ) => void;
}

const RegionLayer: React.FC<Props> = ({
  convert,
  scale,
  zoom,
  mode,
  phase = "all",
  onRegionHover,
}) => {
  const data = regionDataOf();
  const visiblePlots = useMemo(() => {
    if (phase === 1) return data.plots.filter((plot) => isInsidePhase1Boundary(plot));
    if (phase === 2) return data.plots.filter((plot) => !isInsidePhase1Boundary(plot));
    return data.plots;
  }, [phase]);

  const visibleOpenSpaces = useMemo(() => {
    if (phase === 1) return data.openSpaces.filter((os) => isInsidePhase1Boundary(os));
    if (phase === 2) return data.openSpaces.filter((os) => !isInsidePhase1Boundary(os));
    return data.openSpaces;
  }, [phase]);

  const pxPerWorld = scale * zoom;
  const titleDesired =
    Math.max(TITLE_MIN, Math.min(TITLE_MAX, TITLE_BASE * pxPerWorld)) / zoom;

  const strokeProps = {
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    vectorEffect: "non-scaling-stroke" as const,
  };

  if (mode === "fills") {
    return (
      <g id="region-fills">
        {visibleOpenSpaces.map((os, index) => (
          <polygon
            key={`os-${index}`}
            points={os.polygon.map((p) => `${convert(p).x},${convert(p).y}`).join(" ")}
            fill={FILL_OPEN}
            cursor="pointer"
            onMouseMove={(e) => {
              e.stopPropagation();
              onRegionHover?.({ text: os.text, acText: os.acText }, e.clientX, e.clientY);
            }}
            onMouseLeave={() => {
              onRegionHover?.(null, 0, 0);
            }}
          />
        ))}

        {visiblePlots.map((plot, index) => (
          <polygon
            key={`plot-${index}`}
            points={plot.polygon.map((p) => `${convert(p).x},${convert(p).y}`).join(" ")}
            fill={FILL_PLOT}
            {...strokeProps}
          />
        ))}
      </g>
    );
  }

  return (
    <g id="region-labels">
      {data.roadLabels.map((label, index) => {
        const pos = label.snapped ?? { x: label.x, y: label.y };
        const p = convert(pos);
        // label.length is the along-road extent digitized for this label's
        // placeholder box; for the horizontal (non-highway) entries this is
        // far too small to fit any text (a few px), which would otherwise
        // shrink the caption to invisibility. Floor it to a legible minimum
        // — the road itself is much longer than its label, so this never
        // implies a road-geometry claim, only a readable caption size.
        const fitWidthWorld = Math.max(label.length, 1600);
        const fontSize =
          fitFontInBox(
            label.text,
            titleDesired * zoom,
            pxPerWorld,
            fitWidthWorld,
            label.width
          ) / zoom;
        return (
          <text
            key={`rl-${index}`}
            x={p.x}
            y={p.y}
            fill="#000000"
            fontSize={fontSize}
            fontWeight="bold"
            fontFamily="Arial, Helvetica, sans-serif"
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${label.angle} ${p.x} ${p.y})`}
            style={{ userSelect: "none", pointerEvents: "none" }}
          >
            {label.text}
          </text>
        );
      })}

    </g>
  );
};

export default React.memo(RegionLayer);
