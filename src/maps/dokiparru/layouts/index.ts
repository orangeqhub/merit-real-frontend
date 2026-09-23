import type { Point } from "../types/dxf";
import plotNumberMapping from "./dokiparru/plotNumberMapping.json";
import roadGeometry from "./dokiparru/roadGeometry.json";
import openSpacesJson from "./dokiparru/openSpaces.json";
import utilitiesJson from "./dokiparru/utilities.json";
import existingRoadsJson from "./dokiparru/existingRoads.json";
import dokiparruPlan from "./dokiparru/Dokiparru.jpeg";

/* -------------------------------------------------------------------------
 * Dokiparru layout — Phase 3 (GIS infrastructure added; geometry frozen).
 *
 * IMPORTANT — CURRENT STATE (as of Phase 2P):
 * - 378 plots: most are axis-aligned rectangles from the row/column grid
 *   model (tools/digitize/generate-plot-mapping.mjs); 15 plots that sit
 *   against the outer boundary/Donka Road were individually source-traced
 *   as irregular quadrilaterals (Phases 2G-2L) after direct measurement
 *   proved the rectangle was wrong. 38 of 378 plot numbers were
 *   positionally inferred (no direct OCR label match) and remain flagged
 *   needs-review in plotIdentityAudit.json — this is an identity-confidence
 *   flag, unrelated to the geometry-precision work above.
 * - Internal proposed roads (roadGeometry.json): derived MECHANICALLY from
 *   the verified plot column/row gaps (tools/digitize/generate-regions.mjs)
 *   — not boundary-minus-plots, since each road only fills a gap directly
 *   between two documented plot faces. Cross-checked: the derived gap
 *   widths (~59px, ~106px) match the drawing's printed "33'-00"" / "60'-00""
 *   road labels almost exactly, confirming the method. Both 40ft-class
 *   horizontal roads are now found and positioned at their real measured
 *   gap (Phase 2M fixed a bug where they were centered on the wrong plot
 *   row boundary, cutting into 26 plots).
 * - Existing Donka Road (existingRoads.json): rebuilt in Phase 2M/2N from
 *   every individually-traced plot edge along its frontage, not hand-traced
 *   guesswork.
 * - Open-Space-1 and Utility-1 are fully source-traced (Phase 2N/2O),
 *   validated against their printed acreage/area labels. Open-Space-2 is
 *   mostly source-traced (its stepped west edge and main diagonal are
 *   directly measured) but its bottom-west closing edge remains an
 *   approximation — real evidence there points to a different, unrelated
 *   line (the outer boundary's own continuation), not to Open-Space-2's own
 *   closure. Utility-2 remains hand-traced/approximate. Each region file
 *   carries its own `precision` field documenting exactly what is
 *   source-verified vs approximate — read that before trusting a shape.
 * - No Temple / "6 Meters wide Passage" region exists in this layout — that
 *   was a Sri Lakshmi-specific feature; confirmed absent by OCR search of
 *   this drawing before Phase 1, not fabricated here.
 * - Outer boundary (layoutBoundary.json): source-traced-partial as of
 *   Phase 2P. Southern (Donka Road) frontage, B.T. Road frontage (columns
 *   A-N), the west connector (Open-Space-1 area), and the NE/east diagonal
 *   are all directly source-measured. Two small connector segments remain
 *   approximated (documented in the file's own `precision` field) -- this
 *   was an explicit, deliberate stopping point, not an oversight.
 * - All 78 originally-irregular plots were individually source-traced
 *   (Phases 2G-2L); 0 known geometry issues remain in the plot/road system.
 *
 * GIS (Phase 4): single-anchor mode active. A user-supplied real-world
 * coordinate (16.3090, 80.3098 -- the Dokiparru / Elite Sky City location
 * reference) has been anchored to the layout's own bounding-box centroid
 * (world 17590,15334 = image px 1759,1533.4), the same stable reference
 * point DxfCanvas.tsx already computed as its fallback anchor. This is
 * ONE control point -> `validateControlPoints()` reports "single-anchor"
 * mode: translation + the drawing's own printed-dimension scale only.
 * Rotation is ASSUMED zero (north-up) and is UNVERIFIED -- there is no
 * second independent point to check it against. Do not add more control
 * points unless they are real, independently-identifiable coordinates for
 * a specific physical feature; do not fabricate them just to reach
 * "affine-ready" mode. Treat this as approximate GIS positioning, not a
 * surveyed/cadastral placement.
 * ------------------------------------------------------------------------- */

export interface LayoutPlotNumberEntry {
  id: string;
  plotNumber: number;
  polygon: Point[];
  area: number;
  areaSqYd: number | null;
  center: { x: number; y: number };
}

export interface RoadEntry {
  id: string;
  type: string;
  polygon: Point[];
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

export interface ImageUnderlay {
  src: string;
  box: { minX: number; minY: number; width: number; height: number };
}

export interface GisAnchor {
  lat: number;
  lng: number;
}

export interface GisControlPointEntry {
  id: string;
  pixel: { x: number; y: number };
  geo: { longitude: number; latitude: number };
  label?: string;
}

export interface LayoutSpec {
  key: string;
  name: string;
  imageUnderlay: ImageUnderlay;
  plotNumberMapping: LayoutPlotNumberEntry[];
  roads: RoadEntry[];
  existingRoads: RoadEntry[];
  openSpaces: RegionEntry[];
  utilities: RegionEntry[];
  // GIS (Phase 3): additive coordinate-transform layer, does not alter the
  // frozen pixel geometry above. `gisAnchor` is a single verified
  // world-point <-> lat/lng pair; it must come from an authoritative
  // source (survey data, a supplied control coordinate) — never invented.
  // `gisEnabled` gates the satellite/geo overlay entirely; while false the
  // app renders exactly as it did before Phase 3. `gisControlPoints` is an
  // open list for future independent control points (used for residual QA
  // once 2+ exist); it is empty until real ones are supplied.
  gisAnchor: GisAnchor | null;
  gisEnabled: boolean;
  gisControlPoints: GisControlPointEntry[];
}

export const LAYOUTS: LayoutSpec[] = [
  {
    key: "dokiparru",
    name: "Dokiparru Layout",
    // Source JPEG is 4963x3509 px; plot coordinates were digitized at 10x
    // pixel scale (world units = image px * 10), so the underlay box must
    // match 49630x35090 exactly for the image to align with plot polygons.
    imageUnderlay: {
      src: dokiparruPlan,
      box: { minX: 0, minY: 0, width: 49630, height: 35090 },
    },
    plotNumberMapping: plotNumberMapping as unknown as LayoutPlotNumberEntry[],
    roads: roadGeometry as unknown as RoadEntry[],
    existingRoads: existingRoadsJson as unknown as RoadEntry[],
    openSpaces: openSpacesJson as unknown as RegionEntry[],
    utilities: utilitiesJson as unknown as RegionEntry[],
    // Anchor shifted twice (Phase 5) from the originally-supplied
    // 16.3090,80.3098 — NEITHER shift is a survey correction:
    //   1) moved ~475m west/north to the nearest large open field, so the
    //      layout stopped overlapping industrial buildings in the imagery.
    //   2) moved ~126m further south (this change) so Donka Road (the
    //      layout's southern frontage) sits near a second real highway
    //      visible further south in the imagery, at the user's explicit
    //      request. This is a translation-only shift (no scale change);
    //      it necessarily moves B.T. Road (northern frontage) away from
    //      the first real road it was previously sitting close to, since
    //      the real-world gap between those two visible roads (~660px on
    //      screen) is wider than the gap between B.T./Donka Road in the
    //      current drawing-scale-derived geometry (~465px) — the two
    //      roads cannot both be touched without changing scale, which was
    //      NOT authorized here (see the scale investigation elsewhere in
    //      this session, which found supporting evidence for the current
    //      scale and no justification to change it).
    // 3) moved ~174m further west, then 4) another ~217m further west,
    //    both at the user's request, to pull the layout further off the
    //    industrial complex visible on its eastern side and further onto
    //    open field.
    // 5) moved ~87m back east, at the user's request, after the westward
    //    shifts overshot slightly.
    // 6) briefly moved ~311m further west (to line up with a specific open
    //    field visible in the imagery), then immediately reversed at the
    //    user's follow-up request ("move to right side").
    // 7) moved ~150m east of position (5), at the user's explicit request.
    // 8) moved ~408m further west ("4 inches left side", approximated at
    //    96px/inch on the 1600px-wide reference screenshot used throughout
    //    this session), together with a "zoom in" increase to
    //    GIS_VISUAL_SIZE_FACTOR in geoTransform.ts.
    // 9) moved ~101m back east ("move right side some").
    // 10) moved ~100m further east and ~35m south, so the EXISTING DONKA
    //     ROAD band's southern edge reaches the real paved road visible
    //     just south of it in the satellite imagery ("existing donka road
    //     must touch to road"). Also see GIS_VISUAL_SIZE_FACTOR in
    //     geoTransform.ts, increased in this same change ("zoom map
    //     some") — a separate, purely cosmetic zoom-level adjustment that
    //     makes the overlay LOOK larger/smaller on the satellite map
    //     without touching this anchor or the drawing scale.
    // 11) moved ~25m further south (this change, translation only — no
    //     scale/rotation change), a pure global-position correction to
    //     bring BOTH existing-road bands closer to their real satellite
    //     counterparts at once: EXISTING B.T ROAD (north) against the
    //     real highway visible above it, and EXISTING DONKA ROAD (south)
    //     against the real paved road below it. As documented in change
    //     (2) above, these two connections cannot BOTH be made to touch
    //     exactly via translation alone — the real-world gap between the
    //     two visible roads is wider than the gap between B.T./Donka Road
    //     in this drawing's own scale, and the real B.T.-side highway
    //     also runs diagonally rather than parallel to the drawing's
    //     horizontal band. This value is the closest single compromise
    //     Y-shift for both connections simultaneously, not a perfect fit
    //     for either one alone.
    // This remains a purely visual placement choice with LESS certainty
    // than the originally-supplied coordinate, not more.
    gisAnchor: { lat: 16.308109, lng: 80.3020427377752 },
    gisEnabled: true,
    gisControlPoints: [
      {
        id: "user-supplied-anchor",
        pixel: { x: 1759, y: 1533.4 },
        geo: { latitude: 16.308109, longitude: 80.3020427377752 },
        label:
          "Layout bounding-box centroid (visually repositioned eleven times at user request — not a surveyed point, not the originally-supplied coordinate)",
      },
    ],
  },
];

export const DEFAULT_LAYOUT = LAYOUTS[0];

export function getActiveLayout(): LayoutSpec {
  return DEFAULT_LAYOUT;
}

export function getPlotNumberMapping(): LayoutPlotNumberEntry[] {
  return getActiveLayout().plotNumberMapping;
}

export function getImageUnderlay(): ImageUnderlay {
  return getActiveLayout().imageUnderlay;
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

export function getGisAnchor(): GisAnchor | null {
  return getActiveLayout().gisAnchor;
}

export function isGisEnabled(): boolean {
  return getActiveLayout().gisEnabled && getActiveLayout().gisAnchor != null;
}

export function getGisControlPoints(): GisControlPointEntry[] {
  return getActiveLayout().gisControlPoints;
}
