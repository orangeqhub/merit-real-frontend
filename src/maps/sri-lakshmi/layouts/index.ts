import type { Point } from "../types/dxf";

/* -------------------------------------------------------------------------
 * Sri Lakshmi Residency — interactive layout
 *
 * Built as a standalone map app from the working reference
 * (merit-map-layout-main, Anne Enclave). The plan renders as vector plots
 * from plotNumberMapping.json (no image underlay), with plots digitized on
 * top with the in-app tool (`?edit=1`). Data staging lives in the same folder:
 *   src/layouts/sri-lakshmi/  -> plotNumberMapping.json
 *
 * Digitizer flow:
 *   1. Run `npm run dev`, open `/?edit=1`
 *   2. Trace each plot (+ New plot -> click corners -> double-click/Enter)
 *   3. Assign plot numbers, drag vertices to fix corners
 *   4. Export JSON -> replace src/layouts/sri-lakshmi/plotNumberMapping.json
 *   5. Rebuild / seed backend with the new mapping
 * ------------------------------------------------------------------------- */

export type LayoutDataSource = "dxf" | "image";
export type LayoutPhases = 1 | 2 | "none";

export interface LayoutPoint extends Point {}

export interface RegionPolygon {
  polygon: Point[];
  area: number;
}

export interface LabeledRegion extends RegionPolygon {
  text: string;
  textPos: Point;
}

export interface RoadLabel {
  text: string;
  x: number;
  y: number;
  snapped: Point | null;
  angle: number;
  width: number;
  length: number;
}

export interface RegionData {
  roads: RegionPolygon[];
  plots: RegionPolygon[];
  openSpaces: LabeledRegion[];
  utilities: LabeledRegion[];
  roadLabels: RoadLabel[];
}

export interface PhaseBoundaries {
  pink: Point[][];
  orange: Point[][];
}

export interface ImageUnderlay {
  src: string;
  /** World-coordinate box the image fills. Aspect should match the image. */
  box: { minX: number; minY: number; width: number; height: number };
}

export interface BoundaryRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface LayoutPlotNumberEntry {
  id: string;
  plotNumber: number;
  polygon: Point[] | Point[][];
  area: number;
  center?: { x: number; y: number };
}

export interface LayoutSpec {
  key: string;
  name: string;
  dataSource: LayoutDataSource;
  /** Raw DXF text (dataSource "dxf"), null for image layouts. */
  dxfText: string | null;
  /** Reference photo used only as a digitizer tracing aid (?edit=1). Never
   *  rendered in the production map — the map itself is pure SVG vector
   *  geometry (see LayoutBoundaryLayer / RoadLayer / PlotNumberLayer). */
  imageUnderlay: ImageUnderlay | null;
  /**
   * Outer layout footprint (ground plane, drawn behind roads/plots), as a
   * set of non-overlapping axis-aligned rectangles rather than one traced
   * outline. Rectangles were chosen deliberately over a single polygon: a
   * silhouette this irregular (several separately-clustered blocks joined
   * by thin road corridors) produces self-intersecting "bowtie" polygons
   * from most contour-tracing approaches, which SVG's fill rule then
   * renders with holes. A rectangle union can't self-intersect, so it's the
   * robust choice here. Derived from the union of digitized plot geometry
   * (approximation, not survey/GIS-sourced) — replace with official
   * boundary coordinates when available.
   */
  boundary: BoundaryRect[] | null;
  /**
   * Traced outer silhouette of the property (single closed polygon), used
   * ONLY to draw the decorative landscaping margin (green strip + trees)
   * the reference shows running along the property's outer edge. Derived
   * by rasterizing the union of genuine plot/road/open-space/utility
   * geometry and tracing its outer contour — not hand-approximated. Drawn
   * stroke-only (never filled) behind roads/plots, so self-touching points
   * in the traced outline (unlike a filled boundary.ts region, see above)
   * cause no rendering artifacts.
   */
  landscapingBoundary: Point[] | null;
  plotNumberMapping: LayoutPlotNumberEntry[];
  regionData: RegionData;
  phaseBoundaries: PhaseBoundaries | null;
  /** X coordinate that splits Phase 1 / Phase 2 singles; null = single phase. */
  phaseDividerX: number | null;
  gisAnchor: { lat: number; lng: number };
  /** Show the satellite backdrop + GIS projection for this layout. */
  gisEnabled: boolean;
  phases: LayoutPhases;
}

/* -----------------------------
    Sri Lakshmi (image-based layout)
    plotNumberMapping / regionData are digitized via the in-app tool
    (?edit=1) or seeded by the backend.
----------------------------- */

import sriLakshmiPlan from "./sri-lakshmi/sri-lakshmi-divine-city.jpg";
import sriLakshmiPlotNumberMapping from "./sri-lakshmi/plotNumberMapping.json";
import sriLakshmiRegionData from "./sri-lakshmi/regionData.json";
import sriLakshmiBoundary from "./sri-lakshmi/layoutBoundary.json";
import sriLakshmiLandscapingBoundary from "./sri-lakshmi/boundaryLandscaping.json";
import { getGenuinePlots } from "../utils/plotIdentity";

/* -----------------------------
    Registry
----------------------------- */

export const LAYOUTS: LayoutSpec[] = [
  {
    key: "sri-lakshmi",
    name: "Sri Lakshmi Layout",
    dataSource: "image",
    dxfText: null,
    // Srilakshmi Divine City master plan (2700 x 3450), shown in edit mode
    // (?edit=1) as a tracing guide; normal viewers render pure vector plots
    // from plotNumberMapping.json.
    imageUnderlay: {
      src: sriLakshmiPlan,
      // Source JPG is 3450x2700 px; plot/road coordinates were digitized at
      // 10x pixel scale, so the underlay box must match 34500x27000 exactly
      // for the image to align with plot polygons.
      box: { minX: 0, minY: 0, width: 34500, height: 27000 },
    },
    boundary: sriLakshmiBoundary as unknown as BoundaryRect[],
    landscapingBoundary: sriLakshmiLandscapingBoundary as unknown as Point[],
    plotNumberMapping: sriLakshmiPlotNumberMapping as unknown as LayoutPlotNumberEntry[],
    regionData: sriLakshmiRegionData as unknown as RegionData,
    phaseBoundaries: null,
    phaseDividerX: null,
    // Provisional georeferencing anchor: the app pins the layout's
    // bounding-box center (see DxfCanvas.tsx mapView) to this lat/lng,
    // north-up, translation only (no rotation/scale fit to any real road).
    // We do not have survey/GPS coordinates for individual plot corners or
    // any confirmed real-world site, so this is a visual placement only,
    // not a survey-accurate position. This value was picked (not computed
    // from a real alignment) so that road-highway's polygon corner nearest
    // the plots — local world (7850, 10600) — lands close to a point on the
    // real highway visible near 16.07724, 80.13337, so the plot cluster
    // (bounding box starting at local x=8950, immediately east of the
    // highway polygon) extends from that highway into the open farmland to
    // its east rather than sitting over the village. This is still a single
    // translation of the whole rigid layout — same architecture as every
    // prior anchor change — just chosen with the highway's approach corner
    // as the visual reference point instead of the bounding-box center's
    // own position. Replace with a calibrated transform (e.g. least-squares
    // fit from known corner GPS points) if a confirmed real site and survey
    // data ever become available; no other file needs to change to do so.
    gisAnchor: { lat: 16.078177, lng: 80.14289 },
    gisEnabled: true,
    phases: "none",
  },
];

export const DEFAULT_LAYOUT = LAYOUTS[0];

let activeKey: string = DEFAULT_LAYOUT.key;

/** Raw ?layout= value from the URL (does not change active state). */
export function getLayoutKeyFromUrl(): string {
  try {
    return new URLSearchParams(window.location.search).get("layout") ?? "";
  } catch {
    return "";
  }
}

export function getLayoutByKey(key: string | null | undefined): LayoutSpec {
  return LAYOUTS.find((l) => l.key === key) ?? DEFAULT_LAYOUT;
}

/** Resolve + activate the layout from the URL. Idempotent per key. */
export function setActiveLayoutFromUrl(): LayoutSpec {
  const layout = getLayoutByKey(getLayoutKeyFromUrl());
  if (layout.key !== activeKey) {
    activeKey = layout.key;
  }
  return layout;
}

export function getActiveLayout(): LayoutSpec {
  return getLayoutByKey(activeKey);
}

export function getActiveLayoutKey(): string {
  return activeKey;
}

export function getLayouts(): LayoutSpec[] {
  return LAYOUTS;
}

/* -----------------------------
    Layout-scoped data getters
----------------------------- */

/**
 * Authoritative plot list for the active layout. This applies the plot
 * identity audit (layoutGeometryAudit.json / plotNumberMapping.verified.json
 * via utils/plotIdentity.ts): duplicate-polygon artifacts are excluded, and
 * verified plot numbers override the original scan-order numbers. Every
 * consumer (rendering, search, hover, click, counts) must go through this
 * function rather than reading a layout's raw plotNumberMapping directly —
 * there is exactly one source of plot identity in this app.
 */
export function getPlotNumberMapping(): LayoutPlotNumberEntry[] {
  return getGenuinePlots(getActiveLayout().plotNumberMapping);
}

/** Raw, unfiltered geometry list (includes duplicate-polygon artifacts) —
 *  for audit/debug tooling only. Production UI must use
 *  getPlotNumberMapping() instead. */
export function getRawPlotGeometries(): LayoutPlotNumberEntry[] {
  return getActiveLayout().plotNumberMapping;
}

export function getRegionData(): RegionData {
  return getActiveLayout().regionData;
}

export function getLandscapingBoundary(): Point[] | null {
  return getActiveLayout().landscapingBoundary;
}

export function getBoundary(): BoundaryRect[] | null {
  return getActiveLayout().boundary;
}

export function getPhaseBoundaries(): PhaseBoundaries | null {
  return getActiveLayout().phaseBoundaries;
}

export function getPhaseDividerX(): number | null {
  return getActiveLayout().phaseDividerX;
}

export function getPhotoSeriesEnabled(): boolean {
  return getActiveLayout().phases !== "none";
}

export function getImageUnderlay(): ImageUnderlay | null {
  return getActiveLayout().imageUnderlay;
}

export function getGisAnchor(): { lat: number; lng: number } {
  return getActiveLayout().gisAnchor;
}

export function getGisEnabled(): boolean {
  return getActiveLayout().gisEnabled;
}

export function getLayoutName(): string {
  return getActiveLayout().name;
}