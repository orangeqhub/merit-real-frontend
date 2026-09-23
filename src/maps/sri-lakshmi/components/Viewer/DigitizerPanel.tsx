import { useMemo } from "react";
import type { Point, Plot } from "../../models/Plot";
import { calculateArea } from "../../utils/geometry/AreaCalculator";
import "./DigitizerPanel.css";

interface DigitizerPanelProps {
  layoutName: string;
  isDrawing: boolean;
  plots: Plot[];
  currentPoints: Point[];
  selectedPlotId: string | null;
  onStartDrawing: () => void;
  onCancelDrawing: () => void;
  onFinishDrawing: () => void;
  onSelectPlot: (id: string | null) => void;
  onDeletePlot: (id: string) => void;
  onClearPlots: () => void;
  onUpdatePlot: (plot: Plot) => void;
  toWorld: (p: Point) => Point;
}

interface MappingEntry {
  id: string;
  plotNumber: number;
  status: string;
  center: Point;
  centroid: Point;
  area: number;
  polygon: Point[];
}

const round = (value: number): number => Math.round(value * 1000) / 1000;

const centroidOf = (polygon: Point[]): Point => {
  const sum = polygon.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );
  const count = Math.max(1, polygon.length);
  return { x: sum.x / count, y: sum.y / count };
};

const exportMapping = (plots: Plot[], toWorld: (p: Point) => Point): void => {
  const numbered = plots
    .filter((plot) => plot.polygon.length >= 3)
    .map((plot, index) => {
      const raw = parseInt(String(plot.plotNo ?? "").replace(/\D/g, ""), 10);
      return {
        plot,
        plotNumber: Number.isFinite(raw) ? raw : index + 1,
      };
    });

  const seen = new Set<number>();
  const duplicates = numbered.filter(({ plotNumber }) => {
    if (seen.has(plotNumber)) return true;
    seen.add(plotNumber);
    return false;
  });

  if (duplicates.length > 0) {
    window.alert(
      `Duplicate plot number(s): ${duplicates
        .map((d) => d.plotNumber)
        .join(", ")}. Fix them before exporting.`
    );
    return;
  }

  const entries: MappingEntry[] = numbered
    .sort((a, b) => a.plotNumber - b.plotNumber)
    .map(({ plot, plotNumber }, index) => {
      const polygon = plot.polygon.map(toWorld);
      const centroid = centroidOf(polygon);
      return {
        id: `p-${index}`,
        plotNumber,
        status: "",
        center: { x: round(centroid.x), y: round(centroid.y) },
        centroid: { x: round(centroid.x), y: round(centroid.y) },
        area: Math.round(calculateArea(polygon) * 1000) / 1000,
        polygon: polygon.map((p) => ({
          x: round(p.x),
          y: round(p.y),
        })),
      };
    });

  const blob = new Blob([JSON.stringify(entries, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${new Date().toISOString().slice(0, 10)}-sri-lakshmi-plotNumberMapping.json`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(url);
};

const DigitizerPanel: React.FC<DigitizerPanelProps> = ({
  layoutName,
  isDrawing,
  plots,
  currentPoints,
  selectedPlotId,
  onStartDrawing,
  onCancelDrawing,
  onFinishDrawing,
  onSelectPlot,
  onDeletePlot,
  onClearPlots,
  onUpdatePlot,
  toWorld,
}) => {
  const selectedPlot =
    plots.find((plot) => plot.id === selectedPlotId) ?? null;

  const totalArea = useMemo(
    () =>
      plots.reduce(
        (sum, plot) =>
          sum + calculateArea(plot.polygon.map((p) => toWorld(p))),
        0
      ),
    [plots, toWorld]
  );

  return (
    <div className="digitizer-panel">
      <div className="digitizer-header">
        <strong>Digitizer</strong>
        <span className="digitizer-layout">{layoutName}</span>
      </div>

      <div className="digitizer-row digitizer-actions">
        {!isDrawing ? (
          <button
            type="button"
            className="digitizer-btn digitizer-btn-new"
            onClick={onStartDrawing}
          >
            + New plot
          </button>
        ) : (
          <>
            <button
              type="button"
              className="digitizer-btn digitizer-btn-cancel"
              onClick={onCancelDrawing}
            >
              Cancel
            </button>
            <button
              type="button"
              className="digitizer-btn digitizer-btn-done"
              onClick={onFinishDrawing}
            >
              Finish ({currentPoints.length} pts)
            </button>
          </>
        )}
        <button
          type="button"
          className="digitizer-btn digitizer-btn-export"
          onClick={() => exportMapping(plots, toWorld)}
          disabled={plots.length === 0}
        >
          Export JSON
        </button>
      </div>

      {isDrawing && (
        <p className="digitizer-hint">
          Click on the image to add corner points,{" "}
          <b>double-click</b> or <b>Enter</b> to close the polygon.
        </p>
      )}

      {selectedPlot && !isDrawing && (
        <div className="digitizer-edit">
          <label className="digitizer-field">
            <span>Plot number</span>
            <input
              type="text"
              inputMode="numeric"
              value={selectedPlot.plotNo ?? ""}
              placeholder="e.g. 12"
              onChange={(event) =>
                onUpdatePlot({
                  ...selectedPlot,
                  plotNo: event.target.value.replace(/[^\d]/g, ""),
                })
              }
            />
          </label>
          <div className="digitizer-edit-stats">
            <span>
              Area:{" "}
              {Math.round(
                calculateArea(
                  selectedPlot.polygon.map((p) => toWorld(p))
                )
              ).toLocaleString()}{" "}
              sq units
            </span>
          </div>
          <div className="digitizer-edit-actions">
            <button
              type="button"
              className="digitizer-btn digitizer-btn-danger"
              onClick={() => onDeletePlot(selectedPlot.id)}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="digitizer-list">
        <div className="digitizer-list-title">
          Digitized plots ({plots.length})
        </div>
        <div className="digitizer-chips">
          {plots.length === 0 && (
            <span className="digitizer-empty">
              No plots yet — press “New plot” and trace a boundary.
            </span>
          )}
          {plots.map((plot, index) => {
            const number = plot.plotNo || String(index + 1);
            return (
              <button
                key={plot.id}
                type="button"
                className={`digitizer-chip${
                  plot.id === selectedPlotId ? " digitizer-chip-selected" : ""
                }`}
                onClick={() => onSelectPlot(plot.id)}
              >
                {number}
              </button>
            );
          })}
        </div>
      </div>

      <div className="digitizer-footer">
        <span>
          Total area: {Math.round(totalArea).toLocaleString()} sq units
        </span>
        <button
          type="button"
          className="digitizer-link-btn"
          onClick={() => {
            if (window.confirm("Delete all digitized plots in this browser?")) {
              onClearPlots();
            }
          }}
          disabled={plots.length === 0}
        >
          Clear all
        </button>
      </div>
    </div>
  );
};

export default DigitizerPanel;