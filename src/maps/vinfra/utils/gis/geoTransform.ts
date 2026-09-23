// Verified Google Maps coordinate for this site (ORR Nandana Vanam @
// Saripudi), per explicit instruction -- the layout is placed AT this
// exact coordinate, no additional offset applied.
export const GIS_ANCHOR_LAT = 16.378802;
export const GIS_ANCHOR_LNG = 80.308038;

// This layout's world units are feet * FT (FT = 4, see
// tools/generate-layout.mjs) -- i.e. 1 world unit = 1/4 ft = 0.3048/4 m.
export const METERS_PER_WORLD_UNIT = 0.3048 / 4;

const METERS_PER_DEG_LAT = 111320;
const METERS_PER_DEG_LNG = 111320 * Math.cos((GIS_ANCHOR_LAT * Math.PI) / 180);

// The layout's own ORR band (anchored at its centerline's own reference
// point, see DxfCanvas's `anchorWorld`) must sit immediately next to the
// real road, not on top of it -- placing the reference point exactly at
// GIS_ANCHOR_LAT/LNG puts the vector ORR directly over the real road.
// 12ft (a small fraction of the ORR band's own ~65ft road width, see
// generate-layout.mjs) is the tightest offset that still visibly clears
// the real road at the zoom levels this map is viewed at -- the smallest
// correction needed, not a large relocation.
const LAYOUT_OFFSET_WEST_FT = 12;
const LAYOUT_OFFSET_WEST_M = LAYOUT_OFFSET_WEST_FT * 0.3048;
export const LAYOUT_ANCHOR_LAT = GIS_ANCHOR_LAT;
export const LAYOUT_ANCHOR_LNG = GIS_ANCHOR_LNG - LAYOUT_OFFSET_WEST_M / METERS_PER_DEG_LNG;

export interface AnchorWorld {
  x: number;
  y: number;
}

/**
 * Converts a local world-unit point to lat/lng, anchored at `anchor`
 * (which itself sits at LAYOUT_ANCHOR_LAT/LNG). Unlike the reference
 * project, this layout's world y increases SOUTH (down the page, no flip
 * when rendering to screen -- see DxfCanvas's `convert`), so +y moves
 * latitude down (south), not up.
 */
export function worldToLatLng(
  worldX: number,
  worldY: number,
  anchor: AnchorWorld
): { lat: number; lng: number } {
  const dLat =
    (-(worldY - anchor.y) * METERS_PER_WORLD_UNIT) / METERS_PER_DEG_LAT;
  const dLng =
    ((worldX - anchor.x) * METERS_PER_WORLD_UNIT) / METERS_PER_DEG_LNG;

  return {
    lat: LAYOUT_ANCHOR_LAT + dLat,
    lng: LAYOUT_ANCHOR_LNG + dLng,
  };
}

export function metersPerPixelToZoom(
  metersPerPixel: number,
  lat: number
): number {
  return Math.log2(
    (156543.03392 * Math.cos((lat * Math.PI) / 180)) / metersPerPixel
  );
}

export interface MapView {
  center: [number, number];
  zoom: number;
}
