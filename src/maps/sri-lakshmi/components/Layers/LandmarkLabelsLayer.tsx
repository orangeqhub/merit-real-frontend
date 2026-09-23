import React from "react";
import { Point } from "../../types/dxf";
import { getRegionData } from "../../layouts";
import { fitFontInBox } from "../../utils/geometry/TextFitter";

interface Landmark {
  text: string;
  x: number;
  y: number;
  angle: number;
}

interface LabeledRegion {
  polygon: Point[];
  text: string;
  textPos: Point;
  bounds: { width: number; height: number };
}

interface UtilityRegion extends LabeledRegion {
  acText: string;
  acPos: Point;
}

interface RegionData {
  landmarks?: Landmark[];
  openSpaces: LabeledRegion[];
  utilities: UtilityRegion[];
}

const regionDataOf = (): RegionData => getRegionData() as unknown as RegionData;

interface Props {
  convert: (p: Point) => Point;
  scale: number;
  zoom: number;
}

const FONT_SIZE_SCREEN_PX = 11;
const TITLE_MAX = 34;

/** Fixed captions (TEMPLE, UTILITY area, passage width, OPEN SPACE area
 *  figures) — drawn last, above plots/roads/open-space fills, so they're
 *  never partly covered by them. Purely informational, no interaction. */
const LandmarkLabelsLayer: React.FC<Props> = ({ convert, scale, zoom }) => {
  const data = regionDataOf();
  const landmarks = data.landmarks ?? [];
  const openSpaces = data.openSpaces ?? [];
  const utilities = data.utilities ?? [];
  if (!landmarks.length && !openSpaces.length && !utilities.length) return null;
  const fontSize = FONT_SIZE_SCREEN_PX / zoom;
  const pxPerWorld = scale * zoom;

  return (
    <g id="landmark-labels" pointerEvents="none">
      {openSpaces.map((os, index) => {
        const p = convert(os.textPos);
        // These strips are narrow and tall relative to the caption, so the
        // reference prints the text running vertically along the strip —
        // matches every "OPEN SPACE ..." label in the source drawing.
        const vertical = os.bounds.height > os.bounds.width;
        const osFontSize =
          fitFontInBox(
            os.text,
            TITLE_MAX,
            pxPerWorld,
            vertical ? os.bounds.height : os.bounds.width,
            vertical ? os.bounds.width : os.bounds.height
          ) / zoom;
        return (
          <text
            key={`os-label-${index}`}
            x={p.x}
            y={p.y}
            fill="#f5f5f5"
            stroke="#000000"
            strokeWidth={osFontSize * 0.05}
            paintOrder="stroke"
            fontSize={osFontSize}
            fontWeight="bold"
            fontFamily="Arial, Helvetica, sans-serif"
            textAnchor="middle"
            dominantBaseline="middle"
            transform={vertical ? `rotate(-90 ${p.x} ${p.y})` : undefined}
            style={{ userSelect: "none" }}
          >
            {os.text}
          </text>
        );
      })}

      {utilities.map((u, index) => {
        const p = convert(u.textPos);
        const ap = convert(u.acPos);
        return (
          <React.Fragment key={`utility-label-${index}`}>
            <text
              x={p.x}
              y={p.y}
              fill="#1a1a1a"
              fontSize={fontSize}
              fontWeight="bold"
              fontFamily="Arial, Helvetica, sans-serif"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ userSelect: "none" }}
            >
              {u.text}
            </text>
            <text
              x={ap.x}
              y={ap.y}
              fill="#1a1a1a"
              fontSize={fontSize}
              fontWeight="bold"
              fontFamily="Arial, Helvetica, sans-serif"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ userSelect: "none" }}
            >
              {u.acText}
            </text>
          </React.Fragment>
        );
      })}

      {landmarks.map((lm, index) => {
        const p = convert({ x: lm.x, y: lm.y });
        return (
          <text
            key={`landmark-${index}`}
            x={p.x}
            y={p.y}
            fill="#f5f5f5"
            stroke="#000000"
            strokeWidth={fontSize * 0.05}
            paintOrder="stroke"
            fontSize={fontSize}
            fontWeight="bold"
            fontFamily="Arial, Helvetica, sans-serif"
            textAnchor="middle"
            dominantBaseline="middle"
            transform={lm.angle ? `rotate(${lm.angle} ${p.x} ${p.y})` : undefined}
            style={{ userSelect: "none" }}
          >
            {lm.text}
          </text>
        );
      })}
    </g>
  );
};

export default React.memo(LandmarkLabelsLayer);
