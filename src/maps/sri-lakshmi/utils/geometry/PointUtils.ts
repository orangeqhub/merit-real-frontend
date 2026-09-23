import { GPoint } from "./types";

export const EPSILON = 0.01;

export function distance(a: GPoint, b: GPoint) {
  return Math.hypot(
    a.x - b.x,
    a.y - b.y
  );
}

export function samePoint(
  a: GPoint,
  b: GPoint,
  tolerance = EPSILON
) {
  return distance(a, b) <= tolerance;
}

export function pointKey(
  p: GPoint,
  precision = 2
) {
  return `${p.x.toFixed(precision)},${p.y.toFixed(precision)}`;
}