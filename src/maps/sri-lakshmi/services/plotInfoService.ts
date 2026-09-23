import { PlotInformation } from "../models/PlotInformation";
import { createPlotInfoSeed } from "../layouts/seed";
import { getLayoutKeyFromUrl, setActiveLayoutFromUrl, DEFAULT_LAYOUT } from "../layouts";
import { mapBookingService } from "../../../services/mapBookingService";
import { api } from "../../../api/client";
import { getAccessToken } from "../../../api/session";

// Resolve + activate the layout this document renders (idempotent).
setActiveLayoutFromUrl();

// Falls back to this repo's OWN default layout ("sri-lakshmi", from
// layouts/index.ts) when there's no `?layout=` URL param -- natively-mounted
// views have no such param (they're mounted directly, not iframed via a
// `?layout=...` embed URL), so this fallback is the live path, not a rare
// edge case. The original source hardcoded a foreign "anne-enclave" literal
// here (a copy-paste artifact from the shared multi-layout template this
// file originated from), which would have made a natively-mounted Sri
// Lakshmi view silently fetch Anne Enclave's plot data instead of its own.
function layoutKeyScope(): string {
  return getLayoutKeyFromUrl() || DEFAULT_LAYOUT.key;
}

const stores = new Map<string, PlotInformation[] | null>();

function getStore(): PlotInformation[] {
  const key = layoutKeyScope();
  if (!stores.has(key)) {
    stores.set(key, createPlotInfoSeed());
  }
  return stores.get(key)!;
}

function setStore(value: PlotInformation[]): void {
  stores.set(layoutKeyScope(), value);
}

function cloneAll(): PlotInformation[] {
  return getStore().map((plot) => ({ ...plot }));
}

function mapApiPlot(p: Record<string, unknown>): PlotInformation {
  return {
    id: String(p.externalId || p.id),
    plotNo: String(p.plotNo || ""),
    customerName: String(p.customerName || ""),
    plotArea: Number(p.plotArea || 0),
    facing: String(p.facing || ""),
    status: (p.status as PlotInformation["status"]) || "available",
    remarks: String(p.remarks || ""),
    plotCost: Number(p.plotCost || 0),
    ratePerSqYd: Number(p.ratePerSqYd || 0),
    plotType: String(p.plotType || "residential"),
    sizeEast: Number(p.sizeEast || 0),
    sizeWest: Number(p.sizeWest || 0),
    sizeNorth: Number(p.sizeNorth || 0),
    sizeSouth: Number(p.sizeSouth || 0),
  };
}

async function fetchRemotePage(page: number, pageSize: number): Promise<{
  items: PlotInformation[];
  totalPages: number;
} | null> {
  try {
    const data = await mapBookingService.listPlots({
      layout: layoutKeyScope(),
      page,
      pageSize,
    });
    const items = Array.isArray(data?.items) ? data.items.map(mapApiPlot) : [];
    const totalPages = Math.max(1, Number(data?.totalPages) || 1);
    return { items, totalPages };
  } catch {
    return null;
  }
}

async function fetchRemoteAll(): Promise<PlotInformation[] | null> {
  const first = await fetchRemotePage(1, 500);
  if (!first) return null;
  const all = [...first.items];
  for (let page = 2; page <= first.totalPages; page += 1) {
    const next = await fetchRemotePage(page, 500);
    if (!next) break;
    all.push(...next.items);
  }
  return all;
}
function mergeSeedWithRemote(
  remote: PlotInformation[]
): PlotInformation[] {
  const seed = createPlotInfoSeed();
  const byPlotNo: Record<string, PlotInformation> =
    {} as Record<string, PlotInformation>;

  // Geometry (seed) stays the source of identity: keep the seed's `id` and
  // plot number, one entry per plot number printed on the map.
  for (const plot of seed) {
    const key = String(plot.plotNo || "").trim();
    if (!key || byPlotNo[key]) continue;
    byPlotNo[key] = plot;
  }

  // Overlay the backend's business fields onto the matching seed plot by
  // plot number (the number printed on the map) -- NOT by externalId, which
  // never matches the seed's geometry ids. A DB row with no matching
  // geometry is dropped (nothing renders it anyway). Only live values are
  // carried over: blank DB fields stay blank ("—") instead of resurrecting
  // seed defaults, so the tooltip/card never show invented data.
  for (const plot of remote) {
    const key = String(plot.plotNo || "").trim();
    const prev = byPlotNo[key];
    if (!prev) continue;
    byPlotNo[key] = {
      ...prev,
      status: plot.status || "",
      customerName: plot.customerName || "",
      plotArea: plot.plotArea || prev.plotArea,
      facing: plot.facing || "",
      remarks: plot.remarks || "",
      plotCost: plot.plotCost || 0,
      ratePerSqYd: plot.ratePerSqYd || 0,
      plotType: plot.plotType || "residential",
      sizeEast: plot.sizeEast || 0,
      sizeWest: plot.sizeWest || 0,
      sizeNorth: plot.sizeNorth || 0,
      sizeSouth: plot.sizeSouth || 0,
    };
  }

  return Object.values(byPlotNo) as PlotInformation[];
}

export const plotInfoService = {
  async getAll(options: { force?: boolean } = {}): Promise<PlotInformation[]> {
    const remote = await fetchRemoteAll();
    if (remote && remote.length) {
      setStore(mergeSeedWithRemote(remote));
      return cloneAll();
    }
    if (options.force || !getStore().length) {
      setStore(createPlotInfoSeed());
    }
    return cloneAll();
  },

  async getById(id: string): Promise<PlotInformation | undefined> {
    try {
      const data = await mapBookingService.getPlot(id, { layout: layoutKeyScope() });
      if (data) {
        const mapped = mapApiPlot(data);
        const current = getStore();
        const index = current.findIndex((p) => p.id === id);
        if (index >= 0) current[index] = { ...current[index], ...mapped, id };
        else current.push(mapped);
        return { ...mapped };
      }
    } catch {
      // fall through
    }
    const plot = getStore().find((p) => p.id === id);
    return plot ? { ...plot } : undefined;
  },

  async update(
    id: string,
    patch: Partial<PlotInformation>
  ): Promise<PlotInformation> {
    try {
      if (
        patch.plotCost !== undefined ||
        patch.facing !== undefined ||
        patch.remarks !== undefined ||
        patch.plotArea !== undefined
      ) {
        const pricingData = await mapBookingService.updatePricing(id, {
          externalId: id,
          plotNo: patch.plotNo,
          plotCost: patch.plotCost,
          facing: patch.facing,
          remarks: patch.remarks,
          plotArea: patch.plotArea,
          status: patch.status,
        });
        const items = Array.isArray(pricingData?.items) ? pricingData.items : [];
        const matched =
          items.find(
            (item: Record<string, unknown>) =>
              String(item.externalId || item.id) === id
          ) || items[0];
        if (matched) {
          const mapped = mapApiPlot(matched);
          const current = getStore();
          const index = current.findIndex((p) => p.id === id);
          if (index >= 0) current[index] = { ...current[index], ...mapped, id };
          return { ...mapped, id };
        }
      }

      if (patch.status) {
        const data = await api(`/map/plots/${encodeURIComponent(id)}/status`, {
          method: "PATCH",
          token: getAccessToken(),
          body: patch,
        });
        if (data) return mapApiPlot(data as Record<string, unknown>);
      }
    } catch {
      // fall through to local
    }

    const current = getStore();
    const index = current.findIndex((p) => p.id === id);
    if (index < 0) {
      throw new Error(`Plot not found: ${id}`);
    }
    current[index] = { ...current[index], ...patch };
    return { ...current[index] };
  },

  async book(
    id: string,
    body: { customerName?: string; remarks?: string; customerId?: number } = {},
    token?: string
  ): Promise<PlotInformation> {
    void token;
    const data = await mapBookingService.bookPlot(id, body);
    const mapped = mapApiPlot(data);
    const current = getStore();
    const index = current.findIndex((p) => p.id === id || p.id === mapped.id);
    if (index >= 0) current[index] = mapped;
    else current.push(mapped);
    return mapped;
  },

  async updateMany(
    patches: Array<{ id: string; patch: Partial<PlotInformation> }>
  ): Promise<PlotInformation[]> {
    const current = getStore();
    for (const { id, patch } of patches) {
      const index = current.findIndex((p) => p.id === id);
      if (index >= 0) {
        current[index] = { ...current[index], ...patch };
      }
    }
    return cloneAll();
  },
};
