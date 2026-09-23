import { Point } from "../types/dxf";

export function isDashEntity(entity: any): boolean {
  if (entity.type !== "LWPOLYLINE" || entity.shape) return false;
  const vs = entity.vertices;
  if (!vs || vs.length < 2 || vs.length > 4) return false;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const v of vs as Point[]) {
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
  }
  return maxX - minX < 90 && maxY - minY < 90;
}
