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
// Available keeps the bright green used across the Merit map layouts; the
// other statuses use the same colours as the site's status legend
// (PLOT_STATUS_COLORS in src/services/mapBookingService.js) so map, legend
// and Plot Board agree.
export const STATUS_COLORS: Record<PlotStatus, string> = {
  available: "#22C55E",
  booked: "#FFD54F",
  registered: "#42A5F5",
  sold: "#EF5350",
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
