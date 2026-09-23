import { getGisAnchor, getLayoutBoundary, getManjunadhaEnclaveBounds } from "../../layouts";
import type { Point } from "../../types/dxf";

/* ============================================================================
 * DRAWING SCALE
 * ==========================================================================*/

/**
 * Meters-per-world-unit for this layout. Manjunadha's geometry is
 * dimension-driven (see layouts/index.ts header), and world units here are
 * INCHES (1 world unit = 1 inch), not source-image pixels like Dokiparru --
 * so this conversion is exact arithmetic (1 inch = 0.0254 m), not a
 * measured/estimated drawing scale.
 */
export const METERS_PER_WORLD_UNIT = 0.0254;

const METERS_PER_DEG_LAT = 111320;

function metersPerDegLng(atLat: number): number {
  return 111320 * Math.cos((atLat * Math.PI) / 180);
}

/**
 * Only ONE real-world coordinate has been supplied for this layout
 * (16.218828, 80.530682) -- it is not tied to any specific identifiable
 * physical feature in the drawing (no second point exists to check
 * against), so this is single-anchor mode: translation + the drawing's own
 * inch-derived scale only. Rotation is ASSUMED zero (north-up) and is
 * UNVERIFIED. Treat the satellite overlay as an approximate visual
 * placement, not a surveyed/cadastral registration.
 *
 * The anchor is pinned EXACTLY to the layout boundary's own bounding-box
 * centroid -- no manual offset. (An earlier version applied a manual
 * "move right" pixel-reposition offset at a since-superseded request; that
 * has been removed so the layout's true centroid sits exactly on the
 * supplied coordinate, per explicit instruction: "it must place on exact
 * coordinates.")
 */
export function getAnchorWorld(): { x: number; y: number } {
  const b = getLayoutBoundary().polygon;
  const xs = b.map((p) => p.x);
  const ys = b.map((p) => p.y);
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

/**
 * Converts a source world-space point (inches) to lat/lng using the single
 * supplied anchor, with no rotation. Returns null when no GIS anchor has
 * been configured, rather than fabricating a position.
 *
 * Y-AXIS FIX: this layout's local/source Y increases DOWNWARD (south) --
 * standard drawing/image convention, matching the compass rose on the
 * source PDF (north = up = smaller y). Latitude increases NORTHWARD. An
 * earlier version of this function computed dLat with the same sign as
 * worldY, which made increasing worldY (moving south on the drawing)
 * increase latitude (move north) -- a north/south inversion. It was
 * invisible for a single dead-center point (where worldY - anchorWorld.y
 * = 0 by construction) but wrong for every other point, which is why nudge/
 * pan interactions could visibly desync from the satellite imagery. Fixed
 * by negating the Y term.
 */
export function worldToLatLng(
  worldX: number,
  worldY: number,
  anchorWorld: { x: number; y: number }
): { lat: number; lng: number } | null {
  const anchor = getGisAnchor();
  if (!anchor) return null;

  const mPerDegLng = metersPerDegLng(anchor.lat);
  const dLat = (-(worldY - anchorWorld.y) * METERS_PER_WORLD_UNIT) / METERS_PER_DEG_LAT;
  const dLng = ((worldX - anchorWorld.x) * METERS_PER_WORLD_UNIT) / mPerDegLng;

  return {
    lat: anchor.lat + dLat,
    lng: anchor.lng + dLng,
  };
}

export function metersPerPixelToZoom(metersPerPixel: number, lat: number): number {
  return Math.log2((156543.03392 * Math.cos((lat * Math.PI) / 180)) / metersPerPixel);
}

/** Same shape as merit-map-layout-main's GISMap `view` prop (center + zoom,
 * applied via Leaflet's `setView`, not `fitBounds`) -- see DxfCanvas.tsx. */
export interface MapView {
  center: [number, number];
  zoom: number;
}

export type GeoBounds = [[number, number], [number, number]]; // [[south, west], [north, east]]

/**
 * Converts a world-space axis-aligned rectangle (e.g. the complete layout's
 * bounds, or whatever rectangle is currently visible in the SVG viewport)
 * into a geographic bounding box suitable for Leaflet's fitBounds(). This
 * is the "GOOD" path the GIS spec calls for: real lat/lng geometry ->
 * geographic bounds -> map.fitBounds(), not screen-pixel centering.
 */
export function worldRectToGeoBounds(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  anchorWorld: { x: number; y: number }
): GeoBounds | null {
  const nw = worldToLatLng(minX, minY, anchorWorld); // top-left: north, west
  const se = worldToLatLng(maxX, maxY, anchorWorld); // bottom-right: south, east
  if (!nw || !se) return null;
  return [
    [Math.min(nw.lat, se.lat), Math.min(nw.lng, se.lng)],
    [Math.max(nw.lat, se.lat), Math.max(nw.lng, se.lng)],
  ];
}

/**
 * The complete Manjunadha Enclave layout's own geographic bounds (every
 * plot, road, Existing Donka Road, Open Space, Utility, and the outer
 * boundary -- see getManjunadhaEnclaveBounds), used by both the initial
 * map view and the Fit button so they perform the identical geographic
 * operation: local bounds -> GIS transform -> geographic bounds ->
 * map.fitBounds(). Returns null when GIS is not configured.
 */
export function getLayoutFullGeoBounds(): GeoBounds | null {
  const b = getManjunadhaEnclaveBounds();
  return worldRectToGeoBounds(b.minX, b.minY, b.maxX, b.maxY, getAnchorWorld());
}

/**
 * Converts a ring of local/source points (a plot boundary, a road polygon,
 * a region outline, ...) into a Leaflet-ready array of [lat, lng] pairs, in
 * the SAME order -- this is the actual per-vertex geometry that must be
 * handed to a map-native vector layer (e.g. react-leaflet's `<Polygon>`),
 * not converted to screen pixels first. Returns null if any vertex fails
 * (i.e. GIS isn't configured), rather than silently dropping vertices.
 */
export function worldPointsToLatLng(points: Point[], anchorWorld: { x: number; y: number }): [number, number][] | null {
  const out: [number, number][] = [];
  for (const p of points) {
    const ll = worldToLatLng(p.x, p.y, anchorWorld);
    if (!ll) return null;
    out.push([ll.lat, ll.lng]);
  }
  return out;
}
