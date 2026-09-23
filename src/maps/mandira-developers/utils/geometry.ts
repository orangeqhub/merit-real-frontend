import type { Point } from "../types/dxf";

// 1 foot = 4 world units, matching the convention used throughout
// tools/generate-layout.mjs.
export const FT = 4;

export function polygonAreaSqYd(polygon: Point[]): number {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    area += p1.x * p2.y - p2.x * p1.y;
  }
  area = Math.abs(area) / 2; // world units^2
  const sqft = area / (FT * FT);
  return sqft / 9;
}
