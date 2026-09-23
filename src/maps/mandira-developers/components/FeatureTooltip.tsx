import { useMemo, type FC } from "react";

export interface FeatureInfo {
  kind: "Road" | "Open Space" | "Utility";
  label: string;
  areaSqYd?: number | null;
}

interface Props {
  feature: FeatureInfo | null;
  x: number;
  y: number;
}

/**
 * Hover tooltip for non-plot map features (roads, open spaces,
 * utilities), matching PlotTooltip's visual style so hovering feels
 * consistent everywhere on the map.
 */
const FeatureTooltip: FC<Props> = ({ feature, x, y }) => {
  const pos = useMemo(() => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1200;
    const h = typeof window !== "undefined" ? window.innerHeight : 800;
    const tipW = 220;
    const tipH = 80;
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
      <div style={{ fontWeight: "bold", color: "#2E7D32" }}>{feature.kind}</div>
      <div style={{ color: "#111111" }}>{feature.label}</div>
      {feature.areaSqYd != null && feature.areaSqYd > 0 && (
        <div style={{ color: "#444444" }}>
          Area: {feature.areaSqYd.toFixed(2)} Sq.Yds
        </div>
      )}
    </div>
  );
};

export default FeatureTooltip;
