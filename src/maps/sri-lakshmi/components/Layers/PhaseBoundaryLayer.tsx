import React from "react";
import { Point } from "../../types/dxf";
import { getPhaseBoundaries } from "../../layouts";
import { getActiveLayoutKey } from "../../layouts";

interface Props {
  convert: (p: Point) => Point;
}

const ORANGE = "#F57C00";
const PINK = "#E91E8C";

function toPoints(path: Point[], convert: (p: Point) => Point): string {
  return path.map((p) => {
    const c = convert(p);
    return `${c.x},${c.y}`;
  }).join(" ");
}

function asPaths(data: unknown): Point[][] {
  if (!Array.isArray(data) || data.length === 0) return [];
  const first = data[0] as { x?: number } | Point[];
  if (first && typeof (first as { x?: number }).x === "number") {
    return [data as Point[]];
  }
  return data as Point[][];
}

function drawPaths(
  paths: Point[][],
  convert: (p: Point) => Point,
  stroke: string,
  keyPrefix: string
) {
  return paths.map((path, index) => (
    <polyline
      key={`${keyPrefix}-${index}`}
      points={toPoints(path, convert)}
      fill="none"
      stroke={stroke}
      strokeWidth={4}
      strokeLinejoin="round"
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
    />
  ));
}

const PhaseBoundaryLayer: React.FC<Props> = ({ convert }) => {
  const key = getActiveLayoutKey();
  const boundaries = getPhaseBoundaries();
  const orangePaths = boundaries ? asPaths(boundaries.orange) : [];
  const pinkPaths = boundaries ? asPaths(boundaries.pink) : [];

  return (
    <g id={`phase-boundaries-${key}`} style={{ pointerEvents: "none" }}>
      {drawPaths(orangePaths, convert, ORANGE, "orange")}
      {drawPaths(pinkPaths, convert, PINK, "pink")}
    </g>
  );
};

export default React.memo(PhaseBoundaryLayer);
