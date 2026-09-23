import "./Toolbar.css";
import { Crosshair } from "lucide-react";
import type { PhaseFilter } from "../../utils/plotPhases";

interface PhaseCounts {
  all: number;
  phase1: number;
  phase2: number;
}

interface Props {
  setZoom?: React.Dispatch<React.SetStateAction<number>>;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  resetView: () => void;
  phase?: PhaseFilter;
  onPhaseChange?: (phase: PhaseFilter) => void;
  phaseCounts?: PhaseCounts;
}

export default function Toolbar({
  setZoom,
  onZoomIn,
  onZoomOut,
  resetView,
  phase = "all",
  onPhaseChange,
  phaseCounts,
}: Props) {
  const handleZoomIn = onZoomIn ?? (() => setZoom?.((z) => z * 1.2));
  const handleZoomOut = onZoomOut ?? (() => setZoom?.((z) => z / 1.2));
  return (
    <>
      <div className="pointer-events-none absolute top-3 right-3 z-[999] flex flex-col items-center gap-2">
        <div className="pointer-events-auto flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={handleZoomIn}
            className="flex h-10 w-10 items-center justify-center text-lg font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100"
          >
            +
          </button>
          <div className="h-px w-full bg-gray-200" />
          <button
            type="button"
            aria-label="Zoom out"
            onClick={handleZoomOut}
            className="flex h-10 w-10 items-center justify-center text-lg font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100"
          >
            −
          </button>
        </div>
        <button
          type="button"
          aria-label="Reset view"
          title="Fit to view"
          onClick={resetView}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-md hover:bg-gray-50 active:bg-gray-100"
        >
          <Crosshair size={18} />
        </button>
      </div>

      <div className="toolbar">
      {onPhaseChange && (
        <div className="toolbar-phase">
          <button
            type="button"
            className={phase === "all" ? "active phase-all" : "phase-all"}
            onClick={() => onPhaseChange("all")}
            title="Show all plots with Plan-8 numbers"
          >
            All{phaseCounts ? ` (${phaseCounts.all})` : ""}
          </button>
          <button
            type="button"
            className={phase === 1 ? "active phase-1" : "phase-1"}
            onClick={() => onPhaseChange(1)}
            title="Show Phase 1 plots inside the pink boundary"
          >
            Phase 1{phaseCounts ? ` (${phaseCounts.phase1})` : ""}
          </button>
          <button
            type="button"
            className={phase === 2 ? "active phase-2" : "phase-2"}
            onClick={() => onPhaseChange(2)}
            title="Show Phase 2 plots inside the orange boundary"
          >
            Phase 2{phaseCounts ? ` (${phaseCounts.phase2})` : ""}
          </button>
        </div>
      )}
      {phaseCounts && (
        <div className="toolbar-legend" aria-hidden="true">
          <span className="legend-pink">Pink · Phase 1</span>
          <span className="legend-orange">Orange · Phase 2</span>
        </div>
      )}
      </div>
    </>
  );
}
