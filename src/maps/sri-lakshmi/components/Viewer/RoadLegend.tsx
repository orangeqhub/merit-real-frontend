import { useState } from "react";

/**
 * Small collapsible legend explaining the road-hierarchy styling in
 * RoadLayer. Screen-space UI, matches the panel look used by
 * ReferenceComparePanel/DigitizerPanel. Purely informational — road classes
 * are reference-derived (read off the source layout drawing's own road
 * labels), not official survey widths.
 */
export default function RoadLegend() {
  const [collapsed, setCollapsed] = useState(false);

  const swatch = (color: string, width: number) => (
    <span
      style={{
        display: "inline-block",
        width: 22,
        height: Math.max(3, width),
        background: color,
        borderRadius: 1,
      }}
    />
  );

  return (
    <div
      style={{
        position: "absolute",
        left: 16,
        bottom: 16,
        zIndex: 2,
        background: "rgba(24, 24, 27, 0.78)",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 8,
        color: "#e5e7eb",
        fontSize: 12,
        fontFamily: "Arial, Helvetica, sans-serif",
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      <div
        onClick={() => setCollapsed((c) => !c)}
        style={{
          padding: "6px 10px",
          cursor: "pointer",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span>Legend</span>
        <span style={{ opacity: 0.6 }}>{collapsed ? "+" : "−"}</span>
      </div>
      {!collapsed && (
        <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {swatch("#22C55E", 10)}
            <span>Plots</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {swatch("#9C27B0", 10)}
            <span>Utilities</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {swatch("#2E7D32", 10)}
            <span>Open space</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {swatch("#4a4238", 5)}
            <span>National highway</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {swatch("#4b5563", 4)}
            <span>40 ft road</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {swatch("#3f4652", 3)}
            <span>30 ft road</span>
          </div>
          <div style={{ opacity: 0.55, fontSize: 10.5, marginTop: 2, maxWidth: 160 }}>
            Road widths as labeled on the source layout drawing, not official survey data.
          </div>
        </div>
      )}
    </div>
  );
}
