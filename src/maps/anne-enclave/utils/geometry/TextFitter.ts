const FONT_FAMILY = "Arial, Helvetica, sans-serif";

const FALLBACK_AVG_GLYPH = 0.6;

let measureCtx: CanvasRenderingContext2D | null | undefined;

function getCtx(): CanvasRenderingContext2D | null {
  if (measureCtx !== undefined) return measureCtx;
  if (typeof document === "undefined") {
    measureCtx = null;
    return null;
  }
  const canvas = document.createElement("canvas");
  measureCtx = canvas.getContext("2d");
  return measureCtx;
}

export function measureTextWidth(
  text: string,
  fontSizePx: number,
  weight: "normal" | "bold" = "bold"
): number {
  const ctx = getCtx();
  if (!ctx) return text.length * fontSizePx * FALLBACK_AVG_GLYPH;
  ctx.font = `${weight} ${fontSizePx}px ${FONT_FAMILY}`;
  const width = ctx.measureText(text).width;
  return width > 0 ? width : text.length * fontSizePx * FALLBACK_AVG_GLYPH;
}

export const LINE_HEIGHT_FACTOR = 1.25;
export const FIT_MARGIN = 0.92;
export const FIT_PAD_PX = 6;

export function fitScreenFont(
  text: string,
  desiredScreenFont: number,
  pxPerWorld: number,
  maxWidthWorld: number,
  maxHeightWorld: number
): number {
  if (!(pxPerWorld > 0) || !(maxWidthWorld > 0) || !(maxHeightWorld > 0)) {
    return desiredScreenFont;
  }
  const perPx = measureTextWidth(text, 100) / 100;
  if (!(perPx > 0)) return desiredScreenFont;
  const widthFit = (maxWidthWorld * pxPerWorld * FIT_MARGIN) / perPx;
  const heightFit =
    (maxHeightWorld * pxPerWorld * FIT_MARGIN) / LINE_HEIGHT_FACTOR;
  return Math.min(desiredScreenFont, widthFit, heightFit);
}

export function fitFontInBox(
  text: string,
  desiredScreenFont: number,
  pxPerWorld: number,
  maxWidthWorld: number,
  maxHeightWorld: number,
  padPx: number = FIT_PAD_PX
): number {
  if (!(pxPerWorld > 0) || !(maxWidthWorld > 0) || !(maxHeightWorld > 0)) {
    return desiredScreenFont;
  }
  const perPx = measureTextWidth(text, 100) / 100;
  if (!(perPx > 0)) return desiredScreenFont;
  const usableW = Math.max(1, maxWidthWorld * pxPerWorld - padPx * 2);
  const usableH = Math.max(1, maxHeightWorld * pxPerWorld - padPx * 2);
  const widthFit = usableW / perPx;
  const heightFit = usableH / LINE_HEIGHT_FACTOR;
  return Math.min(desiredScreenFont, widthFit, heightFit);
}
