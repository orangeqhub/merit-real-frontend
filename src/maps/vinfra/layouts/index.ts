import type { Point } from "../types/dxf";
import plotNumberMapping from "./vinfra/plotNumberMapping.json";
import roadGeometry from "./vinfra/roadGeometry.json";
import existingRoadsJson from "./vinfra/existingRoads.json";
import openSpacesJson from "./vinfra/openSpaces.json";
import utilitiesJson from "./vinfra/utilities.json";
import outerRoadJson from "./vinfra/outerRoad.json";
import gisConfigJson from "./vinfra/gisConfig.json";
import applicantAreaJson from "./vinfra/applicantArea.json";

/* -----------------------------------------------------------------------
 * V Infra -- "ORR Nandana Vanam @ Saripudi"
 * LP No.: 25 / 2025 / 1168 / MDKDRU / DPMS
 *
 * SOURCE: "V Infra_02.pdf" (single-page layout plan supplied in this
 * folder). This is a from-scratch digitization, not a copy of any other
 * layout's data. See VINFRA_SOURCE_NOTES.md for the full derivation and
 * honesty caveats -- read that file before trusting any one shape.
 *
 * SUMMARY OF METHOD: the source's plot grid is a printed CAD-style table --
 * every one of the 196 plots is arranged in two-column blocks, each row
 * dimensioned with a printed frontage (feet, read off the drawing) and each
 * block dimensioned with a printed depth (45/50 ft). tools/generate-layout.mjs
 * encodes those printed row/column dimensions directly (not estimated from
 * pixels) and places every plot at its correct block/row/column position
 * exactly as drawn, left-to-right and top-to-bottom, matching the source's
 * own left-ascending / right-descending numbering within each block.
 *
 * This is geometrically faithful in ARRANGEMENT, PROPORTION, and every
 * regular plot's printed dimensions. A small set of irregular corner/
 * boundary plots (the ORR-facing strip 1-12, plot 30's ORR-corner notch,
 * plots 49/84-89/124-126 near the south boundary step, the tapering rows
 * of blocks A/B/C/E, and the west boundary strip 187-196) were sized from
 * their own printed dimensions where legible, and are flagged
 * `needsReview: true` where the exact polygon shape (as opposed to area)
 * could not be independently confirmed. Per-plot area (Sq. Yards) for ALL
 * 196 plots comes directly from the source's own printed schedule, not a
 * computed estimate.
 *
 * GIS: no legible geographic control point (address pin, lat/lng, survey
 * marker) exists anywhere on the source drawing -- only a north-arrow
 * compass (confirms the drawing is already north-up; no rotation applied).
 * GIS/satellite overlay is therefore disabled; see gisConfig.json.
 * ------------------------------------------------------------------------- */

export interface LayoutPlotNumberEntry {
  id: string;
  plotNumber: number;
  polygon: Point[];
  area: number;
  areaSqYd: number | null;
  center: { x: number; y: number };
  status: "available" | "booked" | "registered" | "sold";
  landUse?: "amenity" | "mortgage" | "applicant-area" | null;
  needsReview?: boolean;
}

export interface RoadEntry {
  id: string;
  type: string;
  polygon: Point[];
  label?: string;
  // Optional explicit centerline for roads whose shape isn't a simple
  // rectangle (e.g. the ORR's bent diagonal band) -- lets the dashed
  // marking follow the road's real shape instead of a bounding-box guess.
  centerline?: Point[];
}

export interface RegionEntry {
  id: string;
  label: string;
  polygon: Point[];
}

export interface GISConfig {
  enabled: boolean;
  anchor: { lat: number; lng: number } | null;
  scale: number | null;
  rotation: number | null;
}

export interface LayoutSpec {
  key: string;
  name: string;
  plotNumberMapping: LayoutPlotNumberEntry[];
  roads: RoadEntry[];
  existingRoads: RoadEntry[];
  outerRoad: RoadEntry[];
  openSpaces: RegionEntry[];
  utilities: RegionEntry[];
  // Separate, non-plot parcel printed on the source drawing next to plots
  // 1-4 ("Applicant Area") -- not a sellable plot, not Open Space/Utility.
  applicantArea: RegionEntry[];
  gisEnabled: boolean;
  gis: GISConfig;
}

export const LAYOUTS: LayoutSpec[] = [
  {
    key: "vinfra",
    name: "ORR Nandana Vanam @ Saripudi",
    plotNumberMapping: plotNumberMapping as unknown as LayoutPlotNumberEntry[],
    roads: roadGeometry as unknown as RoadEntry[],
    existingRoads: existingRoadsJson as unknown as RoadEntry[],
    outerRoad: outerRoadJson as unknown as RoadEntry[],
    openSpaces: openSpacesJson as unknown as RegionEntry[],
    utilities: utilitiesJson as unknown as RegionEntry[],
    applicantArea: applicantAreaJson as unknown as RegionEntry[],
    // No legible geographic control point in the source -- see the header
    // comment above and gisConfig.json. Do not enable without a real,
    // verifiable coordinate.
    gisEnabled: (gisConfigJson as GISConfig).enabled,
    gis: gisConfigJson as GISConfig,
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

export function getApplicantArea(): RegionEntry[] {
  return getActiveLayout().applicantArea;
}

export function getGISConfig(): GISConfig {
  return getActiveLayout().gis;
}
