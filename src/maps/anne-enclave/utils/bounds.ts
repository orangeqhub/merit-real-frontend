import { Point, DXFDrawing } from "../types/dxf";

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function getBounds(drawing: DXFDrawing): Bounds {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  drawing.entities.forEach((entity: any) => {
    switch (entity.type) {
      case "LWPOLYLINE":
        entity.vertices?.forEach((v: Point) => {
          minX = Math.min(minX, v.x);
          minY = Math.min(minY, v.y);
          maxX = Math.max(maxX, v.x);
          maxY = Math.max(maxY, v.y);
        });
        break;

      case "TEXT":
        if (entity.startPoint) {
          minX = Math.min(minX, entity.startPoint.x);
          minY = Math.min(minY, entity.startPoint.y);
          maxX = Math.max(maxX, entity.startPoint.x);
          maxY = Math.max(maxY, entity.startPoint.y);
        }
        break;

      case "MTEXT":
        if (entity.position) {
          minX = Math.min(minX, entity.position.x);
          minY = Math.min(minY, entity.position.y);
          maxX = Math.max(maxX, entity.position.x);
          maxY = Math.max(maxY, entity.position.y);
        }
        break;

      case "CIRCLE":
        if (entity.center) {
          minX = Math.min(minX, entity.center.x - entity.radius);
          minY = Math.min(minY, entity.center.y - entity.radius);
          maxX = Math.max(maxX, entity.center.x + entity.radius);
          maxY = Math.max(maxY, entity.center.y + entity.radius);
        }
        break;
    }
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function fitPoint(
  point: Point,
  bounds: Bounds,
  canvasWidth: number,
  canvasHeight: number,
  padding = 30
): Point {
  const scale = Math.min(
    (canvasWidth - padding * 2) / bounds.width,
    (canvasHeight - padding * 2) / bounds.height
  );

  return {
    x: (point.x - bounds.minX) * scale + padding,
    y: canvasHeight - ((point.y - bounds.minY) * scale + padding),
  };
}