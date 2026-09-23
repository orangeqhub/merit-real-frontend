import { GPoint } from "./types";

export default class Segment {
  constructor(
    public start: GPoint,
    public end: GPoint
  ) {}

  length() {
    return Math.hypot(
      this.end.x - this.start.x,
      this.end.y - this.start.y
    );
  }

  reverse() {
    return new Segment(this.end, this.start);
  }
}