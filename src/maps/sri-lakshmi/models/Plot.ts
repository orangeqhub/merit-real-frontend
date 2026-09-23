export interface Point {
  x: number;
  y: number;
}

export interface Plot {
  id: string;
  name: string;
  polygon: Point[];
  color: string;
  selected: boolean;
  plotNo?: string;
  surveyNo?: string;
  owner?: string;
  area?: number;
  remarks?: string;
}
