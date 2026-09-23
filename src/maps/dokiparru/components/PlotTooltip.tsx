import { useMemo, type FC } from "react";

export interface TooltipPlotInfo {
  plotNumber: number;
  areaSqYd: number | null;
  facing?: string | null;
  status?: string | null;
  ratePerSqYd?: number | null;
  plotCost?: number | null;
  customerName?: string | null;
}

interface Props {
  plot: TooltipPlotInfo | null;
  x: number;
  y: number;
}

/**
 * Floating hover tooltip, matching merit-map-layout-main's reference
 * PlotTooltip (same layout/colors/positioning-clamp logic) — Dokiparru has
 * no booking backend of its own, so facing/status/rate/cost fall back to
 * "-"/"Available" rather than being fabricated.
 */
const PlotTooltip: FC<Props> = ({ plot, x, y }) => {
  const pos = useMemo(() => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1200;
    const h = typeof window !== "undefined" ? window.innerHeight : 800;
    const tipW = 220;
    const tipH = 140;
    const gap = 14;

    let left = x + gap;
    let top = y + gap;

    if (left + tipW > w) left = Math.max(8, x - tipW - gap);
    if (top + tipH > h) top = Math.max(8, y - tipH - gap);
    if (left < 0) left = 8;
    if (top < 0) top = 8;

    return { left, top };
  }, [x, y]);

  if (!plot) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        maxWidth: "calc(100vw - 16px)",
        background: "#ffffff",
        border: "1px solid #bbbbbb",
        borderRadius: 4,
        padding: "6px 12px",
        fontSize: 13,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
        pointerEvents: "none",
        zIndex: 1001,
        whiteSpace: "nowrap",
        wordBreak: "break-word",
        overflowWrap: "break-word",
      }}
    >
      <div style={{ fontWeight: "bold", color: "#2E7D32" }}>
        Plot {plot.plotNumber}
      </div>
      <div style={{ color: "#111111" }}>
        Area: {plot.areaSqYd != null && plot.areaSqYd > 0 ? plot.areaSqYd : "-"} Sq.Yds
      </div>
      {plot.customerName ? (
        <div style={{ color: "#444444" }}>Customer: {plot.customerName}</div>
      ) : null}
      <div style={{ color: "#444444" }}>Facing: {plot.facing || "—"}</div>
      <div style={{ color: "#444444" }}>
        Status:{" "}
        {plot.status
          ? plot.status.charAt(0).toUpperCase() + plot.status.slice(1)
          : "—"}
      </div>
      <div style={{ color: "#444444" }}>
        Rate:{" "}
        {Number(plot.ratePerSqYd || 0) > 0
          ? `₹${Number(plot.ratePerSqYd).toLocaleString("en-IN")}/Sq.Yd`
          : "-"}
      </div>
      <div style={{ color: "#444444" }}>
        Cost:{" "}
        {Number(plot.plotCost || 0) > 0
          ? `₹${Number(plot.plotCost).toLocaleString("en-IN")}`
          : "-"}
      </div>
    </div>
  );
};

export default PlotTooltip;
