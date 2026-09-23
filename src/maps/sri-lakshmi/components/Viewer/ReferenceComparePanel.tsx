import { useState } from "react";

export interface CompareLayers {
  boundary: boolean;
  roads: boolean;
  plots: boolean;
  labels: boolean;
}

interface Props {
  referenceOpacity: number;
  onReferenceOpacityChange: (v: number) => void;
  svgOpacity: number;
  onSvgOpacityChange: (v: number) => void;
  layers: CompareLayers;
  onLayersChange: (layers: CompareLayers) => void;
}

/**
 * Dev-only tool (?compare=1). Lets you fade between the reference photo and
 * the vector SVG to check alignment directly, and toggle individual vector
 * layers on/off. Never rendered in production.
 */
export default function ReferenceComparePanel({
  referenceOpacity,
  onReferenceOpacityChange,
  svgOpacity,
  onSvgOpacityChange,
  layers,
  onLayersChange,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const toggle = (key: keyof CompareLayers) =>
    onLayersChange({ ...layers, [key]: !layers[key] });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        right: 16,
        zIndex: 50,
        width: collapsed ? "auto" : 260,
        background: "rgba(17, 24, 39, 0.92)",
        color: "#e5e7eb",
        borderRadius: 8,
        padding: 12,
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          fontWeight: 700,
          marginBottom: collapsed ? 0 : 8,
        }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <span>Reference Overlay (dev)</span>
        <span>{collapsed ? "▸" : "▾"}</span>
      </div>

      {!collapsed && (
        <>
          <label style={{ display: "block", marginBottom: 8 }}>
            Reference opacity: {referenceOpacity.toFixed(2)}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={referenceOpacity}
              onChange={(e) => onReferenceOpacityChange(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 10 }}>
            SVG opacity: {svgOpacity.toFixed(2)}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={svgOpacity}
              onChange={(e) => onSvgOpacityChange(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {(Object.keys(layers) as (keyof CompareLayers)[]).map((key) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={() => toggle(key)}
                />
                <span style={{ textTransform: "capitalize" }}>{key}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
