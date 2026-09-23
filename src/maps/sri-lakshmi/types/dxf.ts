export interface Point {
  x: number;
  y: number;
}

export interface LWPolylineEntity {
  type: "LWPOLYLINE";
  vertices: Point[];
  shape?: boolean;
  closed?: boolean;
  layer?: string;
  color?: number;
}

export interface TextEntity {
  type: "TEXT";
  text: string;
  startPoint: Point;
  height: number;
  rotation?: number;
  layer?: string;
}

export interface MTextEntity {
  type: "MTEXT";
  text: string;
  position: Point;
  height: number;
  rotation?: number;
  layer?: string;
}

export interface CircleEntity {
  type: "CIRCLE";
  center: Point;
  radius: number;
}

export type DXFEntity =
  | LWPolylineEntity
  | TextEntity
  | MTextEntity
  | CircleEntity;

export interface DXFDrawing {
  entities: DXFEntity[];
}