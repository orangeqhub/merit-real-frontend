import { PlotInformation } from "../models/PlotInformation";
import { assignPlotPhases } from "../utils/plotPhases";
import { getPlotNumberMapping, getActiveLayoutKey } from "./index";
import type { LayoutPlotNumberEntry } from "./index";
import type { PlotNumberEntry } from "../components/Layers/PlotNumberLayer";

export function createPlotInfoSeed(): PlotInformation[] {
  const mapping = getPlotNumberMapping() as LayoutPlotNumberEntry[];
  return assignPlotPhases(mapping as unknown as PlotNumberEntry[]).map((plot) => ({
    id: plot.id,
    // Internal plot number (NOT the printed/series number for phase 2 --
    // see the `phase` field below, used by plotInfoService's merge to
    // convert this to the series number before matching backend rows).
    plotNo: String(plot.plotNumber),
    phase: plot.phase,
    customerName: "",
    plotArea: Math.round((plot.area ?? 0) * 100) / 100,
    facing: "",
    status: "available",
    remarks: "",
    plotCost: 0,
    sizeEast: 0,
    sizeWest: 0,
    sizeNorth: 0,
    sizeSouth: 0,
  }));
}

export function getActiveLayoutKeyLabel(): string {
  return getActiveLayoutKey();
}