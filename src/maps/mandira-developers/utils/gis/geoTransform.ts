// Verified Google Maps coordinate supplied by the client for this site --
// the Mandira Developers "Quantum City" layout (Korrapadu, Medikonduru,
// Guntur, AP), on the Hyderabad-Guntur National Highway (NH 167 AG).
//
// The complete existing vector layout is anchored AT this exact coordinate:
// the layout's geometric center (all-geometry bounding-box centroid, see
// DxfCanvas) is placed at this lat/lng, so the full layout sits centered
// around the supplied reference point, and the satellite basemap (GISMap)
// is kept in exact pan/zoom sync with the vector SVG.
export const GIS_ANCHOR_LAT = 16.3749;
export const GIS_ANCHOR_LNG = 80.1791;

// This layout's world units are calibrated against the drawing's own
// printed per-plot area schedule: tools/rebuild.mjs computes each plot's
// `areaSqYd` as `area / 144` (area = shoelace over world-unit² polygons),
// i.e. 144 world-unit² == 1 sq.yd == 9 sq.ft, so
//   1 world unit == 12 in == 1 ft/4 == 0.3048 / 4 m
// exactly like map-vinfra's generate-layout.mjs world-unit definition.
export const METERS_PER_WORLD_UNIT = 0.3048 / 4;

const METERS_PER_DEG_LAT = 111320;
const METERS_PER_DEG_LNG = 111320 * Math.cos((GIS_ANCHOR_LAT * Math.PI) / 180);

export interface AnchorWorld {
  x: number;
  y: number;
}

/**
 * Converts a local world-unit point to lat/lng, anchored at `anchor`
 * (which itself sits exactly at GIS_ANCHOR_LAT/LNG). World y increases
 * SOUTH (down the page, no flip when rendering to screen -- see
 * DxfCanvas's `convert`), so +y moves latitude down (south), not up.
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
    lat: GIS_ANCHOR_LAT + dLat,
    lng: GIS_ANCHOR_LNG + dLng,
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