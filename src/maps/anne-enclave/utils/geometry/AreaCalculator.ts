import { Point } from "../../models/Plot";

export const calculateArea = (points: Point[]): number => {
  if (points.length < 3) return 0;

  const closed = [...points, points[0]];
  let areaSquared = 0;

  for (let index = 0; index < closed.length - 1; index += 1) {
    const current = closed[index];
    const next = closed[index + 1];
    areaSquared += current.x * next.y - next.x * current.y;
  }

  return Math.abs(areaSquared) / 2;
};

export default {
  calculateArea,
};