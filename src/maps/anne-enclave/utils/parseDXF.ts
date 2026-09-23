import DxfParser from "dxf-parser";
import { DXFDrawing } from "../types/dxf";

export default function parseDXF(text: string): DXFDrawing {
  const parser = new DxfParser();

  try {
    const drawing = parser.parseSync(text);

    return drawing as unknown as DXFDrawing;
  } catch (error) {
    console.error("DXF Parse Error:", error);

    return {
      entities: [],
    };
  }
}