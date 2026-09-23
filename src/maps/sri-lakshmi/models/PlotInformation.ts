export type PlotStatus = "available" | "booked" | "registered" | "sold";
export type PlotType = "residential" | "amenities" | "commercial" | "mortgage";

export interface PlotInformation {
  id: string;
  plotNo: string;
  customerName: string;
  plotArea: number;
  facing: string;
  status: PlotStatus;
  remarks: string;
  plotCost: number;
  ratePerSqYd?: number;
  plotType?: PlotType | string;
  sizeEast: number;
  sizeWest: number;
  sizeNorth: number;
  sizeSouth: number;
}

export const PLOT_STATUSES: PlotStatus[] = [
  "available",
  "booked",
  "registered",
  "sold",
];

// Single source of truth for plot fill colors — change here, not per-plot.
// Standardized to the bright green used across all Merit map layouts
// (matches merit-map-layout-main's reference styling) — status is still
// tracked in data/tooltips/booking, it just no longer changes plot fill.
export const STATUS_COLORS: Record<PlotStatus, string> = {
  available: "#22C55E",
  booked: "#22C55E",
  registered: "#22C55E",
  sold: "#22C55E",
};

export const TYPE_COLORS: Record<string, string> = {
  amenities: "#22C55E",
  commercial: "#22C55E",
  mortgage: "#22C55E",
};

export const STATUS_LABELS: Record<PlotStatus, string> = {
  available: "Available",
  booked: "Booked",
  registered: "Registered",
  sold: "Sold",
};

export function isPlotStatus(value: string): value is PlotStatus {
  return (PLOT_STATUSES as string[]).includes(value);
}
