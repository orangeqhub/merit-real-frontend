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

interface PlotInfoContextValue {
  plotsById: Record<string, PlotInformation>;
  getPlot: (id: string) => PlotInformation | undefined;
  updatePlot: (id: string, patch: Partial<PlotInformation>) => Promise<void>;
  reloadPlots: () => Promise<void>;
  ready: boolean;
}

const PlotInfoContext = createContext<PlotInfoContextValue | null>(null);
const MAP_DATA_VERSION_KEY = "merit_map_data_version";

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

    const onCustom = () => {
      plotInfoService.getAll({ force: true }).then((plots) => {
        if (!cancelled) applyPlots(plots);
      });
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === MAP_DATA_VERSION_KEY) onCustom();
    };
    const onFocus = () => onCustom();
    const onMessage = (event: MessageEvent) => {
      if (event?.data?.type === "merit-map-data-updated") onCustom();
    };

    window.addEventListener("merit-map-data-updated", onCustom as EventListener);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    window.addEventListener("message", onMessage);

    return () => {
      cancelled = true;
      window.removeEventListener("merit-map-data-updated", onCustom as EventListener);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("message", onMessage);
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
