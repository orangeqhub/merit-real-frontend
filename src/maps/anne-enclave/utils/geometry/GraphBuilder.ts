import Segment from "./Segment";
import { pointKey } from "./PointUtils";

export default class GraphBuilder {

  static build(segments: Segment[]) {

    const graph = new Map<string, Segment[]>();

    for (const segment of segments) {

      const start = pointKey(segment.start);
      const end = pointKey(segment.end);

      if (!graph.has(start))
        graph.set(start, []);

      if (!graph.has(end))
        graph.set(end, []);

      graph.get(start)!.push(segment);
      graph.get(end)!.push(segment);

    }

    return graph;
  }

}