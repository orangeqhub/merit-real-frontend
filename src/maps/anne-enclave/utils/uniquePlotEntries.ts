import type { PlotNumberEntry } from "../components/Layers/PlotNumberLayer";

/**
 * Use every detected plot polygon from the mapping (typically 272).
 * Duplicate plot numbers can appear on both layout copies so every cell is numbered.
 */
export function uniquePlotEntries(
  plots: PlotNumberEntry[]
): PlotNumberEntry[] {
  return [...(plots || [])]
    .filter(
      (plot) =>
        Number.isFinite(Number(plot.plotNumber)) && Number(plot.plotNumber) >= 1
    )
    .sort((a, b) => {
      const byNo = Number(a.plotNumber) - Number(b.plotNumber);
      if (byNo !== 0) return byNo;
      const ax = Number(a.center?.x) || 0;
      const bx = Number(b.center?.x) || 0;
      if (ax !== bx) return ax - bx;
      return String(a.id).localeCompare(String(b.id));
    });
}
