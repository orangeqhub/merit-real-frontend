import React from "react";
import { Plot, Point } from "../../models/Plot";

interface PlotLayerProps {
  plots: Plot[];
  currentPoints: Point[];
  selectedPlotId: string | null;
  hoveredVertex: { plotId: string; vertexIndex: number } | null;
  onSelectPlot?: (id: string | null) => void;
  onVertexMouseDown?: (plotId: string, index: number, event: React.MouseEvent<SVGCircleElement>) => void;
  onVertexHover?: (plotId: string, index: number) => void;
  onVertexLeave?: () => void;
}

const PlotLayer: React.FC<PlotLayerProps> = ({
  plots,
  currentPoints,
  selectedPlotId,
  hoveredVertex,
  onSelectPlot,
  onVertexMouseDown,
  onVertexHover,
  onVertexLeave,
}) => {
  return (
    <g id="plot-layer">
      {plots.map((plot) => {
        const points = plot.polygon.map((p) => `${p.x},${p.y}`).join(" ");
        const isSelected = plot.id === selectedPlotId;

        return (
          <g key={plot.id}>
            <polygon
              points={points}
              fill={isSelected ? "#ff980055" : "#00C80055"}
              stroke={isSelected ? "#ff9800" : "#00C800"}
              strokeWidth={2}
              cursor="pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSelectPlot?.(plot.id);
              }}
            />

            {plot.polygon.map((point, index) => {
              const isHovered = hoveredVertex?.plotId === plot.id && hoveredVertex?.vertexIndex === index;

              return (
                <circle
                  key={`${plot.id}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={isHovered ? 5 : 3.5}
                  fill={isSelected ? "#ffffff" : "#60a5fa"}
                  stroke={isSelected ? "#ff9800" : "#1d4ed8"}
                  strokeWidth={1.5}
                  cursor="grab"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onVertexMouseDown?.(plot.id, index, e);
                  }}
                  onMouseEnter={() => onVertexHover?.(plot.id, index)}
                  onMouseLeave={() => onVertexLeave?.()}
                />
              );
            })}

            <text x={plot.polygon[0]?.x ?? 0} y={(plot.polygon[0]?.y ?? 0) - 5} fontSize={14} fill="#000">
              {plot.plotNo || plot.name}
            </text>
          </g>
        );
      })}

      {currentPoints.length > 0 && (
        <>
          <polyline
            points={currentPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#2196F3"
            strokeWidth={2}
            strokeDasharray="6 4"
          />

          {currentPoints.map((point, index) => (
            <circle key={`preview-${index}`} cx={point.x} cy={point.y} r={4} fill="#2196F3" />
          ))}
        </>
      )}
    </g>
  );
};

export default PlotLayer;
