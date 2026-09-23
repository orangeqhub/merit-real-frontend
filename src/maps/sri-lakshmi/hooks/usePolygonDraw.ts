import { useEffect, useRef, useState } from "react";
import { Plot, Point } from "../models/Plot";

const STORAGE_KEY = "gis_plots";

const clonePlot = (plot: Plot): Plot => ({
  ...plot,
  polygon: plot.polygon.map((point) => ({ ...point })),
});

const clonePlots = (plots: Plot[]): Plot[] => plots.map(clonePlot);

export default function usePolygonDraw() {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const [history, setHistory] = useState<Plot[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const historyRef = useRef<Plot[][]>([]);
  const historyIndexRef = useRef(-1);

  const commitPlotState = (nextPlots: Plot[]) => {
    const snapshot = clonePlots(nextPlots);
    setPlots(snapshot);

    const baseHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    const lastSnapshot = baseHistory[baseHistory.length - 1];

    if (lastSnapshot && JSON.stringify(lastSnapshot) === JSON.stringify(snapshot)) {
      return;
    }

    const nextHistory = [...baseHistory, snapshot];
    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
    setHistory(nextHistory);
    setHistoryIndex(historyIndexRef.current);
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Plot[];
        const initialPlots = clonePlots(parsed);
        setPlots(initialPlots);
        historyRef.current = [initialPlots];
        historyIndexRef.current = 0;
        setHistory([initialPlots]);
        setHistoryIndex(0);
      } catch (err) {
        console.error("Failed to load plots", err);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plots));
  }, [plots]);

  const startDrawing = () => {
    setCurrentPoints([]);
    setIsDrawing(true);
    setSelectedPlotId(null);
  };

  const cancelDrawing = () => {
    setCurrentPoints([]);
    setIsDrawing(false);
  };

  const addPoint = (point: Point) => {
    if (!isDrawing) return;

    setCurrentPoints((prev) => {
      if (prev[prev.length - 1]?.x === point.x && prev[prev.length - 1]?.y === point.y) {
        return prev;
      }
      return [...prev, point];
    });
  };

  const updateLastPoint = (point: Point) => {
    if (!isDrawing) return;

    setCurrentPoints((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      copy[copy.length - 1] = point;
      return copy;
    });
  };

  const finishDrawing = () => {
    if (currentPoints.length < 3) {
      window.alert("Polygon needs at least 3 points.");
      return;
    }

    const plot: Plot = {
      id: crypto.randomUUID(),
      name: `Plot ${plots.length + 1}`,
      polygon: currentPoints.map((point) => ({ ...point })),
      color: "#3B82F6",
      selected: true,
      plotNo: "",
      surveyNo: "",
      owner: "",
      area: 0,
      remarks: "",
    };

    const nextPlots = [...plots, plot];
    commitPlotState(nextPlots);

    setCurrentPoints([]);
    setIsDrawing(false);
    setSelectedPlotId(plot.id);
  };

  const selectPlot = (id: string | null) => {
    setSelectedPlotId(id);

    setPlots((prev) =>
      prev.map((plot) => ({
        ...plot,
        selected: plot.id === id,
      }))
    );
  };

  const deletePlot = (id: string) => {
    const nextPlots = plots.filter((plot) => plot.id !== id);
    commitPlotState(nextPlots);

    if (selectedPlotId === id) {
      setSelectedPlotId(null);
    }
  };

  const updatePlot = (updatedPlot: Plot) => {
    const nextPlots = plots.map((plot) =>
      plot.id === updatedPlot.id ? updatedPlot : plot
    );
    commitPlotState(nextPlots);
  };

  const clearPlots = () => {
    commitPlotState([]);
    setSelectedPlotId(null);
  };

  const updatePlots = (nextPlots: Plot[]) => {
    commitPlotState(nextPlots);
  };

  const undo = () => {
    if (historyIndexRef.current <= 0) return;

    const targetIndex = historyIndexRef.current - 1;
    const previousSnapshot = historyRef.current[targetIndex];

    if (!previousSnapshot) return;

    setPlots(clonePlots(previousSnapshot));
    historyIndexRef.current = targetIndex;
    setHistoryIndex(targetIndex);
  };

  const redo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;

    const targetIndex = historyIndexRef.current + 1;
    const nextSnapshot = historyRef.current[targetIndex];

    if (!nextSnapshot) return;

    setPlots(clonePlots(nextSnapshot));
    historyIndexRef.current = targetIndex;
    setHistoryIndex(targetIndex);
  };

  return {
    plots,
    currentPoints,
    selectedPlotId,
    isDrawing,
    history,
    historyIndex,
    startDrawing,
    cancelDrawing,
    addPoint,
    updateLastPoint,
    finishDrawing,
    deletePlot,
    selectPlot,
    updatePlot,
    clearPlots,
    updatePlots,
    undo,
    redo,
    setPlots,
    setCurrentPoints,
    setIsDrawing,
    setSelectedPlotId,
  };
}
