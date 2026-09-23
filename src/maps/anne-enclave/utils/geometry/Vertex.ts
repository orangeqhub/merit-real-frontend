import { GPoint } from "./types";

export default class Vertex {
  constructor(
    public point: GPoint,
    public neighbours: Vertex[] = []
  ) {}
}