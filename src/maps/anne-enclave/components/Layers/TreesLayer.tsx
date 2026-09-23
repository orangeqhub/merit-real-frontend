import React, { useMemo } from "react";
import { Point } from "../../types/dxf";
import { trees } from "../../utils/layoutDecorations";

interface Props {
  convert: (p: Point) => Point;
  scale: number;
  zoom: number;
}

const CANOPY = "#4e7d3a";
const CANOPY_DARK = "#3f6b30";
const CANOPY_LIGHT = "#5b8f43";
const CANOPY_RIM = "#2f5426";
const TRUNK_COLOR = "#5d4630";
/** Small screen floor so trees stay visible (but tiny) when zoomed out. */
const CROWN_MIN_SCREEN_PX = 3;

/**
 * Landscaping layer: small, well-spaced top-view trees.
 * Crown size comes from decorationConfig() (derived from the measured road
 * width) multiplied by the fit scale, so trees are always proportional to
 * this compact layout and never dominate it.
 */
const TreesLayer: React.FC<Props> = ({ convert, scale, zoom }) => {
  const items = useMemo(() => trees(), []);
  const z = Math.max(Number(zoom) || 1, 0.0001);
  const f = Math.max(Number(scale) || 0, 0);
  // Proportionate size in screen px at the current zoom, with a tiny floor.
  // Drawn values live in post-convert screen units: world size x fitScale,
  // and floors are divided by zoom because the content group scales by zoom.
  const proportionateR = (treeR: number) => Math.max(treeR * f, CROWN_MIN_SCREEN_PX / z);

  return (
    <g id="trees-layer" pointerEvents="none">
      {items.map((tree) => {
        const c = convert(tree.pos);
        const r = proportionateR(tree.r);
        if (r < 1.2) return null;
        return (
          <g key={`tree-${tree.id}`} transform={`translate(${c.x.toFixed(2)}, ${c.y.toFixed(2)})`}>
            <circle cx={r * 0.1} cy={r * 0.14} r={r} fill="#000000" fillOpacity={0.1} />
            {r > 4 && (
              <rect
                x={-r * 0.09}
                y={r * 0.35}
                width={r * 0.18}
                height={r * 0.55}
                rx={r * 0.08}
                fill={TRUNK_COLOR}
              />
            )}
                        <circle cx={0} cy={0} r={r} fill={CANOPY} />
            {r > 3 && (
              <>
                <circle cx={-r * 0.22} cy={-r * 0.24} r={r * 0.62} fill={CANOPY_DARK} />
                <circle cx={r * 0.18} cy={r * 0.16} r={r * 0.55} fill={CANOPY_LIGHT} />
                <circle cx={-r * 0.24} cy={-r * 0.28} r={r * 0.26} fill="#ffffff" fillOpacity={0.1} />
                <circle
                  cx={0}
                  cy={0}
                  r={r}
                  fill="none"
                  stroke={CANOPY_RIM}
                  strokeOpacity={0.45}
                  strokeWidth={Math.max(0.35, r * 0.05)}
                />
              </>
            )}
          </g>
        );
      })}
    </g>
  );
};

export default React.memo(TreesLayer);
