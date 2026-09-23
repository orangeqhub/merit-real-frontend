import React, { useMemo } from "react";
import { Point } from "../../types/dxf";
import {
  roadMarkings,
  roadEdgeLines,
  decorationConfig,
} from "../../utils/layoutDecorations";

interface Props {
  convert: (p: Point) => Point;
  scale: number;
  zoom: number;
}

const MARKING_SCREEN_PX = 1.1;
const DASH_SCREEN_PX = 5;

/**
 * Subtle road dressing painted on top of the existing road fills:
 *  - thin dashed white center lines (with a soft dark casing for depth)
 *  - faint edge lines that follow the actual carriageway boundary and break
 *    at intersections
 * Purely decorative: no pointer events. Roads themselves are not modified.
 */
const RoadMarkingsLayer: React.FC<Props> = ({ convert, scale, zoom }) => {
  const markings = useMemo(() => roadMarkings(), []);
  const edges = useMemo(() => roadEdgeLines(), []);
  const cfg = useMemo(() => decorationConfig(), []);
  const z = Math.max(Number(zoom) || 1, 0.0001);
  const f = Math.max(Number(scale) || 0, 0);

  // Drawn values are post-convert screen units: keep the line a thin fraction
  // of the road width, with small screen floors so it stays visible zoomed out.
  const roadPx = cfg.roadWidth * f;
  const strokeWidth = Math.max(MARKING_SCREEN_PX / z, Math.min(2.4, roadPx * 0.12));
  const dash = Math.max(DASH_SCREEN_PX / z, roadPx * 0.45);
  const gap = dash * 0.8;
  const casingWidth = strokeWidth * 2.6;
  const edgeWidth = Math.max(0.8 / z, Math.min(1.6, roadPx * 0.1));

  const toPoints = (points: Point[]) =>
    points
      .map((p) => {
        const c = convert(p);
        return `${c.x.toFixed(2)},${c.y.toFixed(2)}`;
      })
      .join(" ");

  return (
    <g id="road-markings" pointerEvents="none">
      {/* soft casing under the dashes gives the center line depth */}
      {markings.map((marking) => (
        <polyline
          key={`rmc-${marking.id}`}
          points={toPoints(marking.points)}
          fill="none"
          stroke="#18181b"
          strokeOpacity={0.35}
          strokeWidth={casingWidth}
          strokeLinecap="round"
        />
      ))}
      {markings.map((marking) => (
        <polyline
          key={`rm-${marking.id}`}
          points={toPoints(marking.points)}
          fill="none"
          stroke="#e8edf2"
          strokeOpacity={0.7}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
        />
      ))}
      {/* faint carriageway edge lines */}
      {edges.map((edge) => (
        <polyline
          key={`re-${edge.id}`}
          points={toPoints(edge.points)}
          fill="none"
          stroke="#d4dae1"
          strokeOpacity={0.22}
          strokeWidth={edgeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
};

export default React.memo(RoadMarkingsLayer);
