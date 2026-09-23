import type { Point } from "../types/dxf";
import plotNumberMapping from "./manjunadha/plotNumberMapping.json";
import roadGeometry from "./manjunadha/roads.json";
import openSpacesJson from "./manjunadha/openSpaces.json";
import utilitiesJson from "./manjunadha/utilities.json";
import existingRoadsJson from "./manjunadha/existingRoads.json";
import layoutBoundaryJson from "./manjunadha/layoutBoundary.json";

/* -------------------------------------------------------------------------
 * Manjunadha Enclave layout — digitized from "Manjunadha Enclave
 * Brochure.pdf" page 2 (the printed layout plan; page 1 is marketing-only
 * and was not digitized).
 *
 * METHOD (different from Dokiparru's OCR/pixel-lattice approach): this
 * source drawing prints a surveyed feet-inches dimension on almost every
 * plot edge, so geometry here is DIMENSION-DRIVEN, not pixel-traced. A
 * generator script (tools/digitize/gen_geometry.py, kept for reference/
 * reproducibility) parsed every printed "NN'-NN\"" label per sub-block,
 * built each plot as a rectangle (or, where the drawing itself prints a
 * taper, a trapezoid) from those labels, and laid sub-blocks out edge to
 * edge with the printed 9m/12m road-width labels as the gaps between them.
 * World units here are INCHES (1 unit = 1 inch = 1/12 ft) rather than
 * source-image pixels, since there is no traced underlying pixel grid to
 * stay consistent with.
 *
 * PRECISION, honestly:
 * - Plot widths/heights: printed dimensions used directly wherever a
 *   single value was legible. Where BOTH a left/right (or top/bottom) pair
 *   was printed and they differed by inches, the two were AVERAGED into one
 *   rectangle edge (documented per-region below) rather than built as a
 *   true micro-trapezoid — a deliberate simplification that keeps the grid
 *   perfectly edge-to-edge (no slivers) at the cost of a few inches of
 *   fidelity on interior edges. Where no width was printed at all (plots
 *   42/43/44), it was assumed equal to the nearest printed neighbor
 *   (52'-6", shared by 41's top and 45's bottom) — flagged, not invented
 *   from nothing.
 * - Sub-block ROW TOTALS (top boundary to the shared 12m horizontal road,
 *   and the shared road to the south boundary) were printed slightly
 *   differently across the six upper sub-blocks (119.1ft-130.0ft) and six
 *   lower groups (67.8ft-70.25ft) — real minor surveying variance. Each
 *   set was normalized (scaled +/-1-6%) to one shared target height so the
 *   12m horizontal road renders as one continuous straight polygon instead
 *   of a jagged line. This is the single largest liberty taken with the
 *   source numbers; every other dimension is used as-printed.
 * - Existing Donka Road: its WEST edge is exact — it is literally the
 *   shared east faces of plots 3, 2, 1 and 67&68, whose printed widths
 *   already shrink row by row (76'-11" -> 74'-2" -> 71'-9" -> 67'-11", and
 *   67&68's 78'-8"/73'-7"), which is what encodes the road's real diagonal
 *   angle. Its outer (east) edge is a nominal 40ft parallel offset, since
 *   no road-width dimension is printed for this EXISTING road.
 * - Open Space / Utility: sized from their PRINTED acreages (0.5322 ac /
 *   0.0266 ac respectively) against the layout's own dimension-derived
 *   north-south span — area-accurate rectangles, not a pixel trace of the
 *   gently-irregular tree-line edge seen in the source.
 * - Outer boundary: an approximate bounding rectangle around all
 *   dimension-derived geometry plus a small margin, NOT a pixel trace of
 *   the printed tree-line boundary.
 * - Plot count: the source prints plot numbers 1-68, but 67 and 68 share
 *   ONE drawn polygon and ONE area-table entry ("67&68": 593.48 Sq.Yd) —
 *   represented here as a single record with plotNumber "67&68", giving
 *   67 real plot polygons in total. See getPlotNumberMapping().length for
 *   the live count.
 * - No facing/status/rate/cost is printed per plot in this source, so the
 *   tooltip/detail panel falls back to "-"/"Available" rather than
 *   inventing values (same convention as Dokiparru).
 * - GIS anchor: a real-world coordinate (16.218828, 80.530682, updated from
 *   an earlier user-supplied 16.225659/80.514498) drives a single-anchor,
 *   no-rotation transform (translation + this layout's own inch-derived
 *   drawing scale only, not a surveyed/cadastral registration) -- see
 *   utils/gis/geoTransform.ts (worldToLatLng) and
 *   utils/gis/buildGeoLayers.ts, which converts every plot/road/region/
 *   boundary vertex to real lat/lng ONCE, up front. The Manjunadha layout
 *   is rendered as native Leaflet vector layers (Polygon/Polyline/Marker)
 *   directly inside the same MapContainer as the Esri World Imagery
 *   TileLayer (see components/DxfCanvas.tsx) -- a georeferenced map layer,
 *   not a screen/SVG overlay -- so panning/zooming the map (Leaflet's own,
 *   native) moves and scales the layout automatically as part of Leaflet's
 *   projection, the same way it moves the satellite tiles. The satellite
 *   view is capped at zoom 18 rather than the "true to scale" ~20 implied
 *   by the drawing scale, because Esri's real imagery for this rural area
 *   runs out above that and falls back to blank "Map data not yet
 *   available" tiles at higher zoom.
 * ------------------------------------------------------------------------- */

export interface LayoutPlotNumberEntry {
  id: string;
  plotNumber: number | string;
  polygon: Point[];
  area: number;
  areaSqYd: number | null;
  computedAreaSqYd?: number;
  center: { x: number; y: number };
  hatch?: "green" | "blue" | null;
}

export interface RoadEntry {
  id: string;
  type: string;
  polygon: Point[];
  path?: Point[];
  widthPx?: number;
  label?: string;
  precision?: string;
}

export interface RegionEntry {
  id: string;
  label: string;
  polygon: Point[];
  precision: string;
}

export interface BoundaryEntry {
  polygon: Point[];
  precision: string;
}

export interface GisAnchor {
  lat: number;
  lng: number;
}

export interface LayoutSpec {
  key: string;
  name: string;
  plotNumberMapping: LayoutPlotNumberEntry[];
  roads: RoadEntry[];
  existingRoads: RoadEntry[];
  openSpaces: RegionEntry[];
  utilities: RegionEntry[];
  layoutBoundary: BoundaryEntry;
  gisAnchor: GisAnchor | null;
}

export const LAYOUTS: LayoutSpec[] = [
  {
    key: "manjunadha",
    name: "Manjunadha Enclave",
    plotNumberMapping: plotNumberMapping as unknown as LayoutPlotNumberEntry[],
    roads: roadGeometry as unknown as RoadEntry[],
    existingRoads: existingRoadsJson as unknown as RoadEntry[],
    openSpaces: openSpacesJson as unknown as RegionEntry[],
    utilities: utilitiesJson as unknown as RegionEntry[],
    layoutBoundary: layoutBoundaryJson as unknown as BoundaryEntry,
    gisAnchor: { lat: 16.218828, lng: 80.530682 },
  },
];

export const DEFAULT_LAYOUT = LAYOUTS[0];

export function getActiveLayout(): LayoutSpec {
  return DEFAULT_LAYOUT;
}

export function getPlotNumberMapping(): LayoutPlotNumberEntry[] {
  return getActiveLayout().plotNumberMapping;
}

export function getRoads(): RoadEntry[] {
  return getActiveLayout().roads;
}

export function getExistingRoads(): RoadEntry[] {
  return getActiveLayout().existingRoads;
}

export function getOpenSpaces(): RegionEntry[] {
  return getActiveLayout().openSpaces;
}

export function getUtilities(): RegionEntry[] {
  return getActiveLayout().utilities;
}

export function getLayoutBoundary(): BoundaryEntry {
  return getActiveLayout().layoutBoundary;
}

export function getGisAnchor(): GisAnchor | null {
  return getActiveLayout().gisAnchor;
}

export interface LayoutFitBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

// Extra world-unit margin so the decorative boundary trees (drawn slightly
// outside layoutBoundary's own polygon -- see LayoutBoundaryLayer's
// pushOutward/push, ~7 * 2.4 ~= 17 world units, plus canopy radius) are
// never clipped by a tight viewport fit. Generous on purpose.
const TREE_DECORATION_MARGIN = 40;

/**
 * The single source of truth for "everything that must be visible when the
 * Manjunadha Enclave layout is fit to the viewport" -- every plot, every
 * proposed road, the Existing Donka Road, Open Space, Utility, and the
 * outer boundary itself, plus a small margin for the decorative boundary
 * trees. Used identically by the initial view and the Fit button, so they
 * can never disagree.
 *
 * (layoutBoundary.polygon is already a superset bounding rectangle around
 * all dimension-derived geometry, so in practice it alone determines the
 * result here -- but every layer is still explicitly unioned in, rather
 * than assumed, so this stays correct even if that invariant ever changes.)
 */
export function getManjunadhaEnclaveBounds(): LayoutFitBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const extend = (pts: Point[]) => {
    for (const v of pts) {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
    }
  };

  const layout = getActiveLayout();
  for (const p of layout.plotNumberMapping) extend(p.polygon);
  for (const r of layout.roads) extend(r.polygon);
  for (const r of layout.existingRoads) extend(r.polygon);
  for (const r of layout.openSpaces) extend(r.polygon);
  for (const r of layout.utilities) extend(r.polygon);
  extend(layout.layoutBoundary.polygon);

  minX -= TREE_DECORATION_MARGIN;
  minY -= TREE_DECORATION_MARGIN;
  maxX += TREE_DECORATION_MARGIN;
  maxY += TREE_DECORATION_MARGIN;

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}
