import { PlotInformation } from "../models/PlotInformation";
import { assignPlotPhases } from "../utils/plotPhases";
import { getPlotNumberMapping, getActiveLayoutKey } from "./index";
import type { LayoutPlotNumberEntry } from "./index";
import type { PlotNumberEntry } from "../components/Layers/PlotNumberLayer";

export function createPlotInfoSeed(): PlotInformation[] {
  const mapping = getPlotNumberMapping() as LayoutPlotNumberEntry[];
  return assignPlotPhases(mapping as unknown as PlotNumberEntry[]).map((plot) => ({
    id: plot.id,
    // Same number as printed on the plot in the map layer.
    plotNo: String(plot.plotNumber),
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