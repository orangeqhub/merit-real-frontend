import { useMemo } from "react";
import { PlotInformation, STATUS_LABELS } from "../../models/PlotInformation";

interface Props {
  plot: PlotInformation | null;
  x: number;
  y: number;
}

export default function PlotTooltip({ plot, x, y }: Props) {
  if (!plot) return null;

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
        Plot {plot.plotNo}
      </div>
      <div style={{ color: "#111111" }}>
        Area: {plot.plotArea > 0 ? plot.plotArea : "-"} Sq.Yds
      </div>
      {plot.customerName ? (
        <div style={{ color: "#444444" }}>Customer: {plot.customerName}</div>
      ) : null}
      <div style={{ color: "#444444" }}>Facing: {plot.facing || "-"}</div>
      <div style={{ color: "#444444" }}>
        Status: {plot.status ? STATUS_LABELS[plot.status] ?? plot.status : "—"}
      </div>
      <div style={{ color: "#444444" }}>
        Rate:{" "}
        {Number(plot.ratePerSqYd || 0) > 0
          ? `₹${Number(plot.ratePerSqYd).toLocaleString("en-IN")}/Sq.Yd`
          : "-"}
      </div>
      <div style={{ color: "#444444" }}>
        Cost:{" "}
        {plot.plotCost > 0
          ? `₹${Number(plot.plotCost).toLocaleString("en-IN")}`
          : "-"}
      </div>
    </div>
  );
}
