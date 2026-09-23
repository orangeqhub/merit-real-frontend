import Segment from "./Segment";

export default class GeometryAnalyzer {

  static extractSegments(entities: any[]) {

    const segments: Segment[] = [];

    entities.forEach((entity) => {

      if (entity.type !== "LWPOLYLINE") return;

      const pts = entity.vertices;

      for (let i = 0; i < pts.length - 1; i++) {

        segments.push(
          new Segment(
            {
              x: pts[i].x,
              y: pts[i].y,
            },
            {
              x: pts[i + 1].x,
              y: pts[i + 1].y,
            }
          )
        );

      }

    });

    return segments;

  }

}