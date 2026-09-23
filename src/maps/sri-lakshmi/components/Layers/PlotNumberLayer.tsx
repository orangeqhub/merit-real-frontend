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
const STROKE_HOVER = "#fbbf24";
const STROKE_SELECTED = "#0891b2";
const LABEL_SCREEN_PX = 10;
const LABEL_SCREEN_PX_SELECTED = 11;

// Brightness raised to match merit-map-layout-main's fully-opaque reference
// plot fill (bright green, not muted/muddy); hover/selected stay at 1 so
// they no longer look identical to the resting state.
const FILL_OPACITY_DEFAULT = 0.94;
const FILL_OPACITY_HOVER = 1;
const FILL_OPACITY_SELECTED = 1;

interface Props {
  plots: PlotNumberEntry[];
  convert: (p: Point) => Point;
  scale: number;
  zoom: number;
  selectedId?: string | null;
  highlighted?: Set<number>;
  hoveredId?: string | null;
  fillColor?: (plotId: string) => string;
  onPlotClick?: (plot: PlotNumberEntry) => void;
  onPlotHover?: (plot: PlotNumberEntry | null, x: number, y: number) => void;
  /** Dev-only (?compare=1) toggle to hide number labels while comparing
   *  polygon shapes against the reference photo. Always true in production. */
  showLabels?: boolean;
}

const PlotNumberLayer: React.FC<Props> = ({
  plots,
  convert,
  zoom,
  selectedId,
  highlighted,
  hoveredId,
  fillColor,
  onPlotClick,
  onPlotHover,
  showLabels = true,
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
        const isHovered = plot.id === hoveredId;
        const labelNumber = plot.plotNumber;
        const isHighlighted = highlighted?.has(labelNumber);
        const highlight = isSelected || isHighlighted;
        const labelPx = isSelected ? LABEL_SCREEN_PX_SELECTED : LABEL_SCREEN_PX;

        const stroke = highlight ? STROKE_SELECTED : isHovered ? STROKE_HOVER : STROKE_PLOT;
        const fillOpacity = highlight
          ? FILL_OPACITY_SELECTED
          : isHovered
          ? FILL_OPACITY_HOVER
          : FILL_OPACITY_DEFAULT;
        const strokeWidth =
          (isSelected ? 2.5 : highlight ? 1.75 : isHovered ? 1.75 : 1) / safeZoom;

        return (
          <g key={plot.id}>
            {/* One independent <polygon> per plot (see plots array from
                getPlotNumberMapping()) — every plot is its own hit-tested
                SVG element, not a shared/derived shape. */}
            <polygon
              data-plot-id={plot.id}
              data-plot-number={plot.plotNumber}
              points={plot.polygon
                .map((p) => `${convert(p).x},${convert(p).y}`)
                .join(" ")}
              fill={fillColor ? fillColor(plot.id) : "#22C55E"}
              fillOpacity={fillOpacity}
              stroke={stroke}
              strokeWidth={strokeWidth}
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

            {showLabels && (
            <g
              transform={`translate(${position.x}, ${position.y}) scale(${inverseZoom})`}
              pointerEvents="none"
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
            )}
          </g>
        );
      })}
    </>
  );
};

export default React.memo(PlotNumberLayer);
