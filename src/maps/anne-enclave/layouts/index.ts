import type { Point } from "../types/dxf";

/* -------------------------------------------------------------------------
 * Layout registry (Anne Enclave only)
 *
 * This is a trimmed copy of the source app's multi-layout registry
 * (D:\merit\merit-map-layout-main\src\layouts\index.ts). That source file
 * also registers a second, image-based "sri-lakshmi" layout which is
 * explicitly OUT OF SCOPE for this port (it is superseded by the canonical
 * merit-srilakshmi repo, ported separately). Everything sri-lakshmi related
 * — its import, its JSON/image assets, and its LAYOUTS entry — has been
 * removed here. The Anne Enclave LayoutSpec object below is otherwise
 * byte-for-byte identical to the source, as are all of its data files.
 *
 * The DXF text is loaded lazily via import.meta.glob so the module graph
 * only pulls in what this layout needs.
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
  /** Background image drawn under everything (dataSource "image"). */
  imageUnderlay: ImageUnderlay | null;
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
    Anne Enclave (DXF layout)
------------------------------ */

import anneEnclavePlotNumberMapping from "./anne-enclave/plotNumberMapping.json";
import anneEnclaveRegionData from "./anne-enclave/regionData.json";
import anneEnclavePhaseBoundaries from "./anne-enclave/phaseBoundaries.json";

const DXF_MODULES = import.meta.glob("./anne-enclave/*.dxf", {
  import: "default",
  query: "?raw",
  eager: true,
}) as Record<string, string>;

const anneEnclaveDxfText = Object.values(DXF_MODULES)[0] ?? null;

/* -----------------------------
    Registry
------------------------------ */

export const LAYOUTS: LayoutSpec[] = [
  {
    key: "anne-enclave",
    name: "Sky line Infra Anne Enclave",
    dataSource: "dxf",
    dxfText: anneEnclaveDxfText,
    imageUnderlay: null,
    plotNumberMapping: anneEnclavePlotNumberMapping as unknown as LayoutPlotNumberEntry[],
    regionData: anneEnclaveRegionData as unknown as RegionData,
    phaseBoundaries: anneEnclavePhaseBoundaries as unknown as PhaseBoundaries,
    phaseDividerX: 29653.23850946912,
    gisAnchor: { lat: 16.556278, lng: 80.385222 },
    gisEnabled: true,
    phases: 2,
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
    // All derived-data caches in utils/ are keyed by this value, so switching
    // active layouts transparently rebuilds them. No explicit reset needed.
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
------------------------------ */

export function getPlotNumberMapping(): LayoutPlotNumberEntry[] {
  return getActiveLayout().plotNumberMapping;
}

export function getRegionData(): RegionData {
  return getActiveLayout().regionData;
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
