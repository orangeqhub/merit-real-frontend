import React, { useMemo } from "react";
import { RegionInfo } from "../Layers/RegionLayer";

interface Props {
  region: RegionInfo | null;
  x: number;
  y: number;
}

export default function RegionTooltip({ region, x, y }: Props) {
  if (!region) return null;

  const pos = useMemo(() => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1200;
    const h = typeof window !== "undefined" ? window.innerHeight : 800;
    const tipW = 200;
    const tipH = 60;
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
        zIndex: 1000,
        whiteSpace: "nowrap",
        wordBreak: "break-word",
        overflowWrap: "break-word",
      }}
    >
      <div style={{ fontWeight: "bold", color: "#111111" }}>{region.text}</div>
      {region.acText && (
        <div style={{ color: "#444444", fontSize: 12 }}>{region.acText}</div>
      )}
    </div>
  );
}
