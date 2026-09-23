import React, { useMemo } from "react";
import { Point } from "../../types/dxf";

export interface PlotNumberEntry {
  id: string;
  plotNumber: number;
  /** Plan-8 / PDF number drawn on the plot. */
  displayPlotNumber?: number;
  status: string;
  center: Point;
  centroid: Point;
  area: number;
  polygon: Point[];
}

const STROKE_PLOT = "#1f2937";
const STROKE_SELECTED = "#0891b2";
const LABEL_SCREEN_PX = 10;
const LABEL_SCREEN_PX_SELECTED = 11;

interface Props {
  plots: PlotNumberEntry[];
  convert: (p: Point) => Point;
  scale: number;
  zoom: number;
  selectedId?: string | null;
  highlighted?: Set<number>;
  fillColor?: (plotId: string) => string;
  onPlotClick?: (plot: PlotNumberEntry) => void;
  onPlotHover?: (plot: PlotNumberEntry | null, x: number, y: number) => void;
}

const PlotNumberLayer: React.FC<Props> = ({
  plots,
  convert,
  zoom,
  selectedId,
  highlighted,
  fillColor,
  onPlotClick,
  onPlotHover,
}) => {
  const safeZoom = Math.max(Number(zoom) || 0.001, 0.001);
  const inverseZoom = 1 / safeZoom;

  const labelStyle = useMemo(
    () => ({
      userSelect: "none" as const,
      pointerEvents: "none" as const,
      fontFamily: "Arial, Helvetica, sans-serif",
      paintOrder: "stroke fill" as const,
    }),
    []
  );

  const drawPlots = useMemo(
    () =>
      [...plots].sort(
        (a, b) => (Number(b.area) || 0) - (Number(a.area) || 0)
      ),
    [plots]
  );

  return (
    <>
      {drawPlots.map((plot) => {
        const position = convert(plot.center);
        const isSelected = plot.id === selectedId;
        const labelNumber = plot.plotNumber;
        const isHighlighted = highlighted?.has(labelNumber);
        const highlight = isSelected || isHighlighted;
        const labelPx = isSelected ? LABEL_SCREEN_PX_SELECTED : LABEL_SCREEN_PX;

        return (
          <g key={plot.id}>
            <polygon
              points={plot.polygon
                .map((p) => `${convert(p).x},${convert(p).y}`)
                .join(" ")}
              fill={fillColor ? fillColor(plot.id) : "#22C55E"}
              stroke={highlight ? STROKE_SELECTED : STROKE_PLOT}
              strokeWidth={(isSelected ? 2.5 : highlight ? 1.75 : 1) / safeZoom}
              cursor="pointer"
              onMouseMove={(e) => {
                e.stopPropagation();
                onPlotHover?.(plot, e.clientX, e.clientY);
              }}
              onMouseLeave={() => {
                onPlotHover?.(null, 0, 0);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onPlotClick?.(plot);
              }}
            />

            <g
              transform={`translate(${position.x}, ${position.y}) scale(${inverseZoom})`}
            >
              <text
                x={0}
                y={0}
                fill="none"
                stroke="#111827"
                strokeWidth={2.75}
                strokeLinejoin="round"
                fontSize={labelPx}
                fontWeight={700}
                textAnchor="middle"
                dominantBaseline="central"
                style={labelStyle}
              >
                {labelNumber}
              </text>
              <text
                x={0}
                y={0}
                fill="#ffffff"
                fontSize={labelPx}
                fontWeight={700}
                textAnchor="middle"
                dominantBaseline="central"
                style={labelStyle}
              >
                {labelNumber}
              </text>
            </g>
          </g>
        );
      })}
    </>
  );
};

export default React.memo(PlotNumberLayer);
