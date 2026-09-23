import Segment from "./Segment";
import { pointKey } from "./PointUtils";

export default class ConnectedComponents {
  static analyze(segments: Segment[]) {
    const adjacency = new Map<string, string[]>();

    function addEdge(a: string, b: string) {
      if (!adjacency.has(a)) adjacency.set(a, []);
      adjacency.get(a)!.push(b);
    }

    for (const segment of segments) {
      const a = pointKey(segment.start);
      const b = pointKey(segment.end);

      addEdge(a, b);
      addEdge(b, a);
    }

    const visited = new Set<string>();
    const components: string[][] = [];

    for (const start of adjacency.keys()) {
      if (visited.has(start)) continue;

      const stack = [start];
      const component: string[] = [];

      while (stack.length) {
        const current = stack.pop()!;

        if (visited.has(current)) continue;

        visited.add(current);
        component.push(current);

        for (const next of adjacency.get(current) || []) {
          if (!visited.has(next)) {
            stack.push(next);
          }
        }
      }

      components.push(component);
    }

    return components.sort((a, b) => b.length - a.length);
  }
}