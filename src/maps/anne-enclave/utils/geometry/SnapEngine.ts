import Segment from "./Segment";
import { distance } from "./PointUtils";
import { Point } from "../../models/Plot";

export default class SnapEngine {
  static snap(segments: Segment[], tolerance = 1) {
    const vertices: any[] = [];

    function snapPoint(point: any) {
      for (const v of vertices) {
        if (distance(v, point) <= tolerance) {
          return v;
        }
      }

      vertices.push(point);
      return point;
    }

    return segments.map((segment) => {
      segment.start = snapPoint(segment.start);
      segment.end = snapPoint(segment.end);
      return segment;
    });
  }

  static findNearestPoint(points: Point[], target: Point, tolerance = 10) {
    let nearest: Point | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    points.forEach((point) => {
      const currentDistance = Math.hypot(point.x - target.x, point.y - target.y);

      if (currentDistance < nearestDistance) {
        nearestDistance = currentDistance;
        nearest = point;
      }
    });

    return nearestDistance <= tolerance ? nearest : null;
  }
}