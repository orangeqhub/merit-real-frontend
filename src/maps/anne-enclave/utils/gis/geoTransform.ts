import { getGisAnchor } from "../../layouts";

export const METERS_PER_WORLD_UNIT = 0.0254;

const METERS_PER_DEG_LAT = 111320;

export interface AnchorWorld {
  x: number;
  y: number;
}

export function worldToLatLng(
  worldX: number,
  worldY: number,
  anchor: AnchorWorld
): { lat: number; lng: number } {
  const { lat: anchorLat, lng: anchorLng } = getGisAnchor();
  const METERS_PER_DEG_LNG = 111320 * Math.cos((anchorLat * Math.PI) / 180);
  const dLat =
    ((worldY - anchor.y) * METERS_PER_WORLD_UNIT) / METERS_PER_DEG_LAT;
  const dLng =
    ((worldX - anchor.x) * METERS_PER_WORLD_UNIT) / METERS_PER_DEG_LNG;

  return {
    lat: anchorLat + dLat,
    lng: anchorLng + dLng,
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
