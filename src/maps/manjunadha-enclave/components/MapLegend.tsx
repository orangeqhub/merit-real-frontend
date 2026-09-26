import { useState, type FC } from "react";
// Same colours the plot polygons are filled with (plotFillColor).
import { STATUS_COLORS } from "../hooks/useLayoutPlotData";

const MapLegend: FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  const swatch = (color: string) => (
    <span
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        background: color,
        borderRadius: 3,
        border: "1px solid rgba(255,255,255,0.25)",
      }}
    />
  );

  return (
    <div
      style={{
        position: "absolute",
        left: 12,
        bottom: 12,
        zIndex: 1000,
        background: "rgba(24, 24, 27, 0.82)",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 8,
        color: "#e5e7eb",
        fontSize: 12,
        fontFamily: "Arial, Helvetica, sans-serif",
        userSelect: "none",
        overflow: "hidden",
        maxWidth: 220,
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
          <div style={{ fontWeight: 700, opacity: 0.8, marginTop: 2 }}>Geometry</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {swatch("#22C55E")}
            <span>Plots</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {swatch("#9C27B0")}
            <span>Utilities</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {swatch("#2E7D32")}
            <span>Open space</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {swatch("#64748b")}
            <span>Roads</span>
          </div>
          <div style={{ fontWeight: 700, opacity: 0.8, marginTop: 6 }}>Plot status</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {swatch(STATUS_COLORS.available)}
            <span>Available</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {swatch(STATUS_COLORS.booked)}
            <span>Booked</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {swatch(STATUS_COLORS.registered)}
            <span>Registered</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {swatch(STATUS_COLORS.sold)}
            <span>Sold</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapLegend;
