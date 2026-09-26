import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PlotInformation } from "../models/PlotInformation";
import { plotInfoService } from "../services/plotInfoService";
import { onMapDataUpdated } from "../../../utils/mapDataSync";

interface PlotInfoContextValue {
  plotsById: Record<string, PlotInformation>;
  getPlot: (id: string) => PlotInformation | undefined;
  updatePlot: (id: string, patch: Partial<PlotInformation>) => Promise<void>;
  reloadPlots: () => Promise<void>;
  ready: boolean;
}

const PlotInfoContext = createContext<PlotInfoContextValue | null>(null);

export function PlotInfoProvider({ children }: { children: ReactNode }) {
  const [plotsById, setPlotsById] = useState<Record<string, PlotInformation>>(
    {}
  );
  const [ready, setReady] = useState(false);

  const applyPlots = useCallback((plots: PlotInformation[]) => {
    const map: Record<string, PlotInformation> = {};
    plots.forEach((plot) => {
      map[plot.id] = plot;
    });
    setPlotsById(map);
    setReady(true);
  }, []);

  const reloadPlots = useCallback(async () => {
    const plots = await plotInfoService.getAll({ force: true });
    applyPlots(plots);
  }, [applyPlots]);

  useEffect(() => {
    let cancelled = false;
    plotInfoService.getAll({ force: true }).then((plots) => {
      if (!cancelled) applyPlots(plots);
    });

    // Same refresh trigger as the Plot Board (import, focus, visibility, poll),
    // so the map card and the board always reload together.
    const unsubscribe = onMapDataUpdated(() => {
      plotInfoService.getAll({ force: true }).then((plots) => {
        if (!cancelled) applyPlots(plots);
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [applyPlots]);

  const getPlot = useCallback(
    (id: string) => plotsById[id],
    [plotsById]
  );

  const updatePlot = useCallback(
    async (id: string, patch: Partial<PlotInformation>) => {
      const updated = await plotInfoService.update(id, patch);
      setPlotsById((prev) => ({ ...prev, [id]: updated }));
    },
    []
  );

  const value = useMemo(
    () => ({ plotsById, getPlot, updatePlot, reloadPlots, ready }),
    [plotsById, getPlot, updatePlot, reloadPlots, ready]
  );

  return (
    <PlotInfoContext.Provider value={value}>{children}</PlotInfoContext.Provider>
  );
}

export function usePlotInfo(): PlotInfoContextValue {
  const ctx = useContext(PlotInfoContext);
  if (!ctx) {
    throw new Error("usePlotInfo must be used within PlotInfoProvider");
  }
  return ctx;
}
