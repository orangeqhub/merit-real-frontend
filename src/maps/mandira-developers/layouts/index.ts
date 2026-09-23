import type { Point } from "../types/dxf";
import plotNumberMapping from "./mandira/plotNumberMapping.json";
import roadGeometry from "./mandira/roadGeometry.json";
import existingRoadsJson from "./mandira/existingRoads.json";
import openSpacesJson from "./mandira/openSpaces.json";
import utilitiesJson from "./mandira/utilities.json";
import outerRoadJson from "./mandira/outerRoad.json";

/* -----------------------------------------------------------------------
 * Mandira Developers -- "Quantum City" (Korrapadu, Medikonduru, Guntur, AP),
 * on the Hyderabad-Guntur National Highway (NH 167 AG).
 *
 * SOURCE: mandira-developers.pdf (single-page layout plan supplied in this
 * folder). This is a from-scratch digitization, not a copy of any other
 * layout's data.
 *
 * IMPORTANT -- HOW THIS DATA WAS BUILT (read before trusting a shape):
 * The source plan is a clean, printed CAD-style layout with plot numbers
 * and per-plot area figures (sq. yards) legible at high PDF render
 * resolution. Cross-checking printed areas against
 * area_sqyd = width_ft * depth_ft / 9 confirmed the layout uses a
 * STANDARD 50ft plot depth almost everywhere, with a small, repeating set
 * of row widths (27/32/36/45ft in the "top" band nearer the highway,
 * 62/36/30/28ft in the "bottom" band nearer the park). tools/generate-layout.mjs
 * encodes that verified template and places each of the 193 numbered
 * plots at its correct block/row/column position exactly as drawn.
 *
 * This is geometrically faithful in ARRANGEMENT and PROPORTION, but is
 * NOT a pixel-traced replica of the architect's CAD file: interior plots
 * use the template's derived width x 50ft depth rather than a
 * hand-traced polygon, since the printed dimensions are the more
 * reliable source for a regular grid than eyeballing pixel corners.
 * Irregular plots (85, 86, the wedge 15-19 along "Existing Road", the
 * left-boundary strip 181-193) were sized from their OWN printed area
 * figure, not the template, and are flagged `needsReview: true` in
 * plotNumberMapping.json.
 *
 * PLOT COUNT: the source's own marketing copy says "Total Plots: 200+".
 * The highest plot number legible anywhere on the drawing is 193, and
 * every number from 1 to 193 is present exactly once (verified: 193
 * total records, 193 unique numbers, zero duplicates, zero gaps). The
 * digitized, verified count is therefore 193 -- the "200+" figure appears
 * to be rounded-up marketing language, not a count this drawing itself
 * supports plot-by-plot. This discrepancy is intentional to report, not
 * a bug: no plot numbers were invented to reach 200.
 *
 * UTILITIES: no separately-labeled utility-only area is visible in the
 * source. The two green amenity strips contain a tennis court and a row
 * of "model 2BHK" homes, but both sit inside the open-space/park
 * polygons themselves. utilities.json is therefore intentionally empty
 * rather than populated with an invented utility plot.
 *
 * GIS: the client subsequently supplied a verified geographic anchor
 * (lat 16.3749, lng 80.1791) for this site. The COMPLETE existing layout
 * (see src/utils/gis/geoTransform.ts + DxfCanvas's anchorWorld) is placed
 * with its all-geometry bounding-box centroid exactly at that coordinate,
 * at its real-world scale (1 world unit = 0.25 ft = 0.0762 m, from the
 * drawing's own area schedule), and rendered over the live satellite
 * basemap (GISMap) behind the vector SVG. No vector geometry was changed
 * to make it fit -- only the world->lat/lng placement is defined.
 * ------------------------------------------------------------------------- */

export interface LayoutPlotNumberEntry {
  id: string;
  plotNumber: number;
  polygon: Point[];
  area: number;
  areaSqYd: number | null;
  center: { x: number; y: number };
  needsReview?: boolean;
}

export interface RoadEntry {
  id: string;
  type: string;
  polygon: Point[];
  label?: string;
  crossLines?: { a: Point; b: Point }[];
}

export interface RegionEntry {
  id: string;
  label: string;
  polygon: Point[];
}

export interface LayoutSpec {
  key: string;
  name: string;
  plotNumberMapping: LayoutPlotNumberEntry[];
  roads: RoadEntry[];
  existingRoads: RoadEntry[];
  // Outer/perimeter road -- a separate, additive layer distinct from
  // `existingRoads`. Traces the real forked shape of the "Existing Road"
  // complex (source dimension labels 57'-7", 130'-8", 21'-6", 69'-2",
  // 165'-9") that the crude single-quadrilateral `existing-road` entry
  // above does not capture. Positioned via an approximate pixel-to-world
  // calibration against plots 1/7's known coordinates, not a precise
  // survey trace -- see MANDIRA_SOURCE_NOTES.md.
  outerRoad: RoadEntry[];
  openSpaces: RegionEntry[];
  utilities: RegionEntry[];
  gisEnabled: boolean;
}

export const LAYOUTS: LayoutSpec[] = [
  {
    key: "mandira-developers",
    name: "Mandira Developers - Quantum City",
    plotNumberMapping: plotNumberMapping as unknown as LayoutPlotNumberEntry[],
    roads: roadGeometry as unknown as RoadEntry[],
    existingRoads: existingRoadsJson as unknown as RoadEntry[],
    outerRoad: outerRoadJson as unknown as RoadEntry[],
    openSpaces: openSpacesJson as unknown as RegionEntry[],
    utilities: utilitiesJson as unknown as RegionEntry[],
    // Geographic anchor supplied by the client: lat 16.3749, lng 80.1791.
    // The whole layout is placed so its centroid sits exactly at that
    // coordinate -- see src/utils/gis/geoTransform.ts.
    gisEnabled: true,
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

export function getOuterRoad(): RoadEntry[] {
  return getActiveLayout().outerRoad;
}

export function getOpenSpaces(): RegionEntry[] {
  return getActiveLayout().openSpaces;
}

export function getUtilities(): RegionEntry[] {
  return getActiveLayout().utilities;
}
