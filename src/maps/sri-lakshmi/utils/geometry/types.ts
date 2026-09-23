export interface GPoint {
  x: number;
  y: number;
}

export interface Segment {
  id: number;
  start: GPoint;
  end: GPoint;
}

export interface Loop {
  id: number;
  vertices: GPoint[];
}

export interface PlotPolygon {
  id: number;
  vertices: GPoint[];
  area: number;
  centroid: GPoint;
  label?: string;
}