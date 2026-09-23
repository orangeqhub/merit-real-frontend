import { useMemo, type FC } from "react";

export interface TooltipFeatureInfo {
  title: string;
  lines: string[];
}

interface Props {
  feature: TooltipFeatureInfo | null;
  x: number;
  y: number;
}

/**
 * Floating hover tooltip for non-plot geometry (roads, Open Space,
 * Utility, Applicant Area). Mirrors PlotTooltip's visual pattern (white
 * card, rounded corners, subtle shadow) so hovering any feature on the
 * map feels consistent, but with a generic title/lines shape since these
 * features don't have a plot number, status, or price.
 */
const FeatureTooltip: FC<Props> = ({ feature, x, y }) => {
  const pos = useMemo(() => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1200;
    const h = typeof window !== "undefined" ? window.innerHeight : 800;
    const tipW = 240;
    const tipH = 90;
    const gap = 14;

    let left = x + gap;
    let top = y + gap;

    if (left + tipW > w) left = Math.max(8, x - tipW - gap);
    if (top + tipH > h) top = Math.max(8, y - tipH - gap);
    if (left < 0) left = 8;
    if (top < 0) top = 8;

    return { left, top };
  }, [x, y]);

  if (!feature) return null;

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
      <div style={{ fontWeight: "bold", color: "#334155" }}>{feature.title}</div>
      {feature.lines.map((line, i) => (
        <div key={i} style={{ color: "#444444" }}>
          {line}
        </div>
      ))}
    </div>
  );
};

export default FeatureTooltip;
