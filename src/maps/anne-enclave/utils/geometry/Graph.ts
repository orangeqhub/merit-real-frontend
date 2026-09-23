import Vertex from "./Vertex";
import Segment from "./Segment";

export default class Graph {
  vertices: Vertex[] = [];

  segments: Segment[] = [];

  addSegment(segment: Segment) {
    this.segments.push(segment);
  }

  addVertex(vertex: Vertex) {
    this.vertices.push(vertex);
  }
}