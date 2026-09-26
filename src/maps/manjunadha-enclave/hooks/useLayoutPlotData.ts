import { useCallback, useEffect, useState } from "react";
import { mapBookingService } from "../../../services/mapBookingService";
import { onMapDataUpdated } from "../../../utils/mapDataSync";

export interface LayoutPlotRow {
  id: string;
  plotNo: string;
  status: string | null;
  plotArea: number | null;
  facing: string | null;
  ratePerSqYd: number | null;
  plotCost: number | null;
  customerName: string | null;
  plotType: string | null;
}

// Same palette as the public site's PLOT_STATUS_COLORS
// (merit-real-frontend-main/src/services/mapBookingService.js) so the
// embedded map canvas agrees with the board legend on the host page.
export const STATUS_COLORS: Record<string, string> = {
  available: "#A5D66A",
  booked: "#FFD54F",
  registered: "#42A5F5",
  sold: "#EF5350",
};

export const STATUS_LABELS: Record<string, string> = {
  available: "Available",
  booked: "Booked",
  registered: "Registered",
  sold: "Sold",
};

/** The host embeds this app with ?embed=1&layout=<key> (see mapLayoutIframeUrl). */
export function layoutKeyFromUrl(fallback: string): string {
  try {
    const v = new URL(window.location.href).searchParams.get("layout");
    if (v) return v;
  } catch {
    // ignore
  }
  return fallback;
}

/**
 * Polygon fill for a plot given its live per-layout row. Falls back to the
 * original green when the plot has no row / no status (the row's status --
 * whatever the Excel/seed had -- is the only thing that drives the colour;
 * nothing is invented).
 */
export function plotFillColor(row: LayoutPlotRow | null | undefined): string {
  return (row?.status && STATUS_COLORS[row.status]) || STATUS_COLORS.available;
}

/**
 * Live, layout-scoped plot data for the embedded map canvas. Fetches the
 * same `/map/plots?layout=<key>` source of truth the main website's board
 * and details card use, keyed by plotNo (the number printed on the map),
 * and re-fetches whenever the host broadcasts `merit-map-data-updated`
 * (e.g. right after an admin Excel upload).
 */
export function useLayoutPlotData(fallbackLayoutKey: string): {
  rows: Record<string, LayoutPlotRow>;
  loaded: boolean;
} {
  const [rows, setRows] = useState<Record<string, LayoutPlotRow>>({});
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const layout = layoutKeyFromUrl(fallbackLayoutKey);
    try {
      const items: unknown[] = await mapBookingService.listAllPlots({ layout });
      const map: Record<string, LayoutPlotRow> = {};
      for (const it of items as Array<Record<string, unknown>>) {
        const plotNo = String(it.plotNo ?? "").trim();
        if (!plotNo) continue;
        map[plotNo] = {
          id: String(it.externalId || it.id || ""),
          plotNo,
          status: it.status ? String(it.status).toLowerCase() : null,
          plotArea: it.plotArea != null ? Number(it.plotArea) : null,
          facing: it.facing ? String(it.facing) : null,
          ratePerSqYd: it.ratePerSqYd != null ? Number(it.ratePerSqYd) : null,
          plotCost: it.plotCost != null ? Number(it.plotCost) : null,
          customerName: it.customerName ? String(it.customerName) : null,
          plotType: it.plotType ? String(it.plotType) : null,
        };
      }
      // A successful fetch is the complete current state of this layout.
      setRows(map);
    } catch {
      // keep last known rows; the map still renders geometry offline
    } finally {
      setLoaded(true);
    }
  }, [fallbackLayoutKey]);

  useEffect(() => {
    load();
    return onMapDataUpdated(load);
  }, [load]);

  return { rows, loaded };
}