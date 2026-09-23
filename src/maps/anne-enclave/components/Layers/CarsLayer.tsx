import React, { useMemo } from "react";
import { Point } from "../../types/dxf";
import { carRoutes, decorationConfig } from "../../utils/layoutDecorations";

interface Props {
  /** Converts world coordinates to screen space (same transform as other layers). */
  convert: (p: Point) => Point;
  scale: number;
  zoom: number;
}

/** One distinct colour per car - no colour is ever repeated. */
const CAR_PALETTE = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#78716c", "#dc2626", "#ea580c",
  "#ca8a04", "#16a34a", "#0891b2", "#2563eb",
  "#7c3aed", "#c026d3", "#db2777", "#475569",
];

function carColor(index: number): string {
  if (index < CAR_PALETTE.length) return CAR_PALETTE[index];
  // Golden-angle hue spread keeps colours unique beyond the palette size.
  return `hsl(${(index * 137.508) % 360}, 72%, 52%)`;
}

const CAR_SPEED = 190;
/** Small screen floor so cars stay clearly visible when zoomed out. */
const CAR_MIN_SCREEN_PX = 13;
/** Route length (world units) represented by each additional car. */
const CAR_PER_ROUTE_LENGTH = 3500;
const MAX_CARS_PER_ROUTE = 5;

interface CarSpec {
  key: string;
  d: string;
  dur: number;
  begin: number;
  color: string;
}

/**
 * Cars driving along every road center line (existing roads and the added
 * corridors). Long routes carry several evenly spaced cars so no stretch of
 * road sits empty. Paths are converted to screen space like every other
 * layer, so cars always sit exactly on the carriageway and never near plots.
 */
const CarsLayer: React.FC<Props> = ({ convert, scale, zoom }) => {
  const routes = useMemo(() => carRoutes(), []);
  const cfg = useMemo(() => decorationConfig(), []);
  const z = Math.max(Number(zoom) || 1, 0.0001);
  const f = Math.max(Number(scale) || 0, 0);

  // Screen-space size: proportionate to road width (world x fitScale),
  // with a small floor so cars stay visible when zoomed out.
  const len = Math.max(cfg.carLength * f, CAR_MIN_SCREEN_PX / z);
  const wid = len * (cfg.carWidth / cfg.carLength);

  const cars = useMemo<CarSpec[]>(() => {
    let colorIndex = 0;
    const specs: CarSpec[] = [];
    routes.forEach((route) => {
      const d = route.points
        .map((p) => convert(p))
        .map((c, j) => `${j === 0 ? "M" : "L"}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
        .join(" ");
      const dur = Math.max(12, route.length / CAR_SPEED);
      const count = Math.min(
        MAX_CARS_PER_ROUTE,
        Math.max(1, Math.round(route.length / CAR_PER_ROUTE_LENGTH))
      );
      for (let k = 0; k < count; k++) {
        specs.push({
          key: `car-${route.id}-${k}`,
          d,
          dur,
          // Negative begin spreads the cars along the route instantly.
          begin: -(dur * k) / count - route.id * 0.7,
          color: carColor(colorIndex++),
        });
      }
    });
    return specs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes, convert]);

  return (
    <g id="cars-layer" pointerEvents="none">
      <defs>
        <g id="car-body">
          <rect
            x={-len / 2}
            y={-wid / 2}
            width={len}
            height={wid}
            rx={wid * 0.35}
          />
          <rect
            x={-len * 0.18}
            y={-wid * 0.32}
            width={len * 0.36}
            height={wid * 0.64}
            rx={wid * 0.16}
            fill="#0f172a"
            fillOpacity={0.55}
          />
        </g>
      </defs>
      {cars.map((car) => (
        <g key={car.key}>
          <use
            href="#car-body"
            fill={car.color}
            stroke="#0f172a"
            strokeOpacity={0.6}
            strokeWidth={Math.max(0.8 / z, wid * 0.06)}
          />
          <animateMotion
            dur={`${car.dur.toFixed(2)}s`}
            begin={`${car.begin.toFixed(2)}s`}
            repeatCount="indefinite"
            rotate="auto"
            path={car.d}
            calcMode="linear"
          />
        </g>
      ))}
    </g>
  );
};

export default React.memo(CarsLayer);
