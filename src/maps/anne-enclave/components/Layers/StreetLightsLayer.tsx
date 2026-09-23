import React, { useMemo } from "react";
import { Point } from "../../types/dxf";
import { streetLights, decorationConfig } from "../../utils/layoutDecorations";

interface Props {
  convert: (p: Point) => Point;
  scale: number;
  zoom: number;
}

/** Small screen floors so lights stay visible (but tiny) when zoomed out. */
const LAMP_MIN_SCREEN_PX = 1.1;
const GLOW_MIN_SCREEN_PX = 2.4;

/**
 * Street lights: a thin pole, a short arm and a small warm lamp head with a
 * very subtle glow. Sizes derive from decorationConfig() (road-width based)
 * scaled by the fit scale, so they stay proportional to this compact layout.
 * No large halos.
 */
const StreetLightsLayer: React.FC<Props> = ({ convert, scale, zoom }) => {
  const lights = useMemo(() => streetLights(), []);
  const cfg = useMemo(() => decorationConfig(), []);

  const z = Math.max(Number(zoom) || 1, 0.0001);
  const f = Math.max(Number(scale) || 0, 0);
  // Drawn values are post-convert screen units: world size x fitScale keeps
  // lights proportional at every zoom; floors divided by zoom stay tiny.
  const lampR = Math.max(cfg.lightLampRadius * f, LAMP_MIN_SCREEN_PX / z);
  const glowR = Math.max(
    Math.min(cfg.lightGlowRadius * f, lampR * 2.6),
    GLOW_MIN_SCREEN_PX / z
  );
  const armLen = lampR * 2.8;
  const poleW = Math.max(0.7 / z, lampR * 0.34);

  return (
    <g id="street-lights-layer" pointerEvents="none">
      <defs>
        <radialGradient id="street-light-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe9a8" stopOpacity={0.26} />
          <stop offset="100%" stopColor="#ffe08a" stopOpacity={0} />
        </radialGradient>
      </defs>
      {lights.map((light) => {
        const c = convert(light.pos);
        // Arm points toward the road (perpendicular to the center line).
        const nx = -Math.sin(light.angle);
        const ny = Math.cos(light.angle);
        return (
          <g key={`sl-${light.id}`} transform={`translate(${c.x.toFixed(2)}, ${c.y.toFixed(2)})`}>
            {/* very subtle glow around the head */}
            <circle
              cx={nx * armLen}
              cy={ny * armLen}
              r={glowR}
              fill="url(#street-light-glow)"
            />
            {/* thin pole */}
            <line
              x1={-nx * lampR * 1.6}
              y1={-ny * lampR * 1.6}
              x2={nx * armLen * 0.55}
              y2={ny * armLen * 0.55}
              stroke="#4b5563"
              strokeWidth={poleW}
              strokeLinecap="round"
            />
            {/* short arm */}
            <line
              x1={nx * armLen * 0.55}
              y1={ny * armLen * 0.55}
              x2={nx * armLen}
              y2={ny * armLen}
              stroke="#4b5563"
              strokeWidth={Math.max(0.6 / z, lampR * 0.3)}
              strokeLinecap="round"
            />
            {/* small lamp head */}
            <circle
              cx={nx * armLen}
              cy={ny * armLen}
              r={lampR}
              fill="#fde68a"
              stroke="#92400e"
              strokeOpacity={0.7}
              strokeWidth={Math.max(0.35 / z, lampR * 0.22)}
            />
          </g>
        );
      })}
    </g>
  );
};

export default React.memo(StreetLightsLayer);
