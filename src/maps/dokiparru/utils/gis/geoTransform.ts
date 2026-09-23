import { getGisAnchor, getGisControlPoints, isGisEnabled } from "../../layouts";

/* ============================================================================
 * DRAWING SCALE  (distinct from GEOREFERENCING TRANSFORM — see section below)
 * ==========================================================================*/

/**
 * World-unit-to-meters scale for the Dokiparru layout, derived from the
 * SOURCE DRAWING ITSELF — not from any geographic survey.
 *
 * Dokiparru's world units are purely raster-derived: world units =
 * source-image pixels * 10 (see src/layouts/index.ts). There is no CAD/DXF
 * unit to read, so this constant comes from the drawing's own printed road
 * widths, cross-validated repeatedly across Phases 2-2P:
 *   - "PROPOSED 33'-00" WIDE ROAD" columns measure ~59 image-px wide
 *   - "PROPOSED 60'-00" WIDE ROAD" columns measure ~106 image-px wide
 *   - both ratios agree on ~1.788 image-px per foot
 * i.e. 17.88 world-units per foot, so:
 *   1 world unit = 1 / 17.88 ft = 0.055928 ft = 0.0170470 m
 *
 * USE OF THIS CONSTANT:
 * - It is the scale used by MODE A (single-anchor) rendering below, because
 *   with only one control point there is no other source of scale.
 * - Once 2+ real control points exist, treat this constant as a
 *   CONSISTENCY CHECK ONLY (see `compareDrawingScaleToControlPoints`) — the
 *   control-point-implied scale is the one that should be believed. This
 *   constant must never silently override real control-point evidence.
 *
 * This is a source-drawing scale factor. It is not a surveyed, cadastral,
 * or otherwise geographically authoritative scale.
 */
export const DRAWING_SCALE_METERS_PER_WORLD_UNIT = 0.017047;

/**
 * Purely cosmetic GIS-view sizing knob, separate from
 * DRAWING_SCALE_METERS_PER_WORLD_UNIT. Applied ONLY to the satellite map's
 * zoom-level calculation (see DxfCanvas.tsx's mapView) — it changes how
 * large the (unmodified) SVG overlay LOOKS relative to the satellite
 * imagery underneath it, without touching the real drawing-scale constant
 * that the distance/rotation cross-checks in this session were validated
 * against. Set at explicit user request ("decrease some size of
 * maplayout"); this is a visual preference, not a re-derived or more
 * accurate scale.
 */
export const GIS_VISUAL_SIZE_FACTOR = 1.6;

/** @deprecated kept as an alias for the Phase 3 name; use DRAWING_SCALE_METERS_PER_WORLD_UNIT. */
export const METERS_PER_WORLD_UNIT_DOKIPARRU = DRAWING_SCALE_METERS_PER_WORLD_UNIT;

const METERS_PER_DEG_LAT = 111320;

function metersPerDegLng(atLat: number): number {
  return 111320 * Math.cos((atLat * Math.PI) / 180);
}

/* ============================================================================
 * TYPES
 * ==========================================================================*/

export interface AnchorWorld {
  x: number;
  y: number;
}

/**
 * A real-world control point: a specific, physically-identifiable pixel in
 * Dokiparru.jpeg (image px, NOT world units — multiply by 10 for world
 * space, same convention as every other manually-measured coordinate in
 * this project) paired with an authoritative geographic coordinate for
 * that exact physical feature (a road intersection, a surveyed corner —
 * never a place-name text label).
 */
export interface ControlPoint {
  id: string;
  pixel: { x: number; y: number };
  geo: { longitude: number; latitude: number };
  label?: string;
}

export interface ControlPointResidual {
  id: string;
  label?: string;
  pixel: { x: number; y: number };
  geo: { longitude: number; latitude: number };
  transformed: { lat: number; lng: number } | null;
  latErrorDeg: number | null;
  lngErrorDeg: number | null;
  residualMeters: number | null;
}

export type TransformMode =
  | "disabled" // gisEnabled is false, or no valid anchor
  | "single-anchor" // exactly 1 usable control point: translation + drawing scale only
  | "scale-direction-partial" // 2 points: implied scale/bearing computed, but unvalidated (need 3+ for affine)
  | "affine-ready"; // 3+ non-collinear points: enough to validate/derive an affine transform

export interface ControlPointValidation {
  mode: TransformMode;
  valid: boolean;
  pointCount: number;
  errors: string[];
  warnings: string[];
}

export interface MapView {
  center: [number, number];
  zoom: number;
}

/* ============================================================================
 * CONTROL-POINT VALIDATION
 * ==========================================================================*/

const COLLINEARITY_TOLERANCE = 1e-6; // normalized cross-product threshold

function pixelKey(p: { x: number; y: number }): string {
  return `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
}
function geoKey(g: { longitude: number; latitude: number }): string {
  return `${g.latitude.toFixed(7)},${g.longitude.toFixed(7)}`;
}

/** Are three points collinear (within tolerance), using normalized cross product? */
function areCollinear(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): boolean {
  const abx = b.x - a.x,
    aby = b.y - a.y;
  const acx = c.x - a.x,
    acy = c.y - a.y;
  const cross = abx * acy - aby * acx;
  const abLen = Math.hypot(abx, aby) || 1;
  const acLen = Math.hypot(acx, acy) || 1;
  const normalized = Math.abs(cross) / (abLen * acLen);
  return normalized < COLLINEARITY_TOLERANCE;
}

/**
 * Validates the currently-configured control points and reports which
 * transform mode they legitimately support. NEVER silently proceeds with
 * an invalid set — callers must check `.valid` before trusting `.mode`.
 */
export function validateControlPoints(): ControlPointValidation {
  const points = getGisControlPoints();
  const errors: string[] = [];
  const warnings: string[] = [];

  if (points.length === 0) {
    errors.push("No control points configured.");
    return { mode: "disabled", valid: false, pointCount: 0, errors, warnings };
  }

  const seenPixels = new Set<string>();
  const seenGeo = new Set<string>();
  for (const p of points) {
    const pk = pixelKey(p.pixel);
    const gk = geoKey(p.geo);
    if (seenPixels.has(pk)) errors.push(`Duplicate source pixel at control point "${p.id}".`);
    if (seenGeo.has(gk)) errors.push(`Duplicate geographic coordinate at control point "${p.id}".`);
    seenPixels.add(pk);
    seenGeo.add(gk);
  }

  if (errors.length > 0) {
    return { mode: "disabled", valid: false, pointCount: points.length, errors, warnings };
  }

  if (points.length === 1) {
    warnings.push(
      "Only 1 control point: translation only. Scale is assumed from the drawing's printed dimensions and rotation is assumed zero (north-up). Neither is verified."
    );
    return { mode: "single-anchor", valid: true, pointCount: 1, errors, warnings };
  }

  if (points.length === 2) {
    warnings.push(
      "Only 2 control points: an implied scale and bearing can be computed between them, but this is NOT enough to validate/derive a full affine transform (rotation could still be wrong in a way 2 points can't reveal). Add a 3rd non-collinear point before trusting orientation."
    );
    return { mode: "scale-direction-partial", valid: true, pointCount: 2, errors, warnings };
  }

  // 3+ points: check that at least one non-collinear triple exists.
  let foundNonCollinear = false;
  outer: for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      for (let k = j + 1; k < points.length; k++) {
        if (!areCollinear(points[i].pixel, points[j].pixel, points[k].pixel)) {
          foundNonCollinear = true;
          break outer;
        }
      }
    }
  }

  if (!foundNonCollinear) {
    errors.push(
      `All ${points.length} control points are collinear (or nearly so) in source-pixel space — insufficient to validate an affine transform. Add a point that is not on the same line.`
    );
    return { mode: "scale-direction-partial", valid: false, pointCount: points.length, errors, warnings };
  }

  return { mode: "affine-ready", valid: true, pointCount: points.length, errors, warnings };
}

/**
 * Returns the current transform mode the app will actually use for
 * rendering, taking gisEnabled into account. This governs the activation
 * guard — GIS never renders on an invalid or absent control-point set,
 * even if gisEnabled is true.
 *
 * NOTE: per Phase 3B scope, MODE B (affine) is validated/reported here but
 * NOT yet wired into rendering — rendering always uses MODE A
 * (single-anchor) math when active, using the first configured control
 * point (or the legacy `gisAnchor`) as the anchor. Activating true
 * multi-point affine rendering is a deliberate future step, not automatic.
 */
export function getEffectiveTransformMode(): TransformMode {
  if (!isGisEnabled()) return "disabled";
  const validation = validateControlPoints();
  if (!validation.valid) return "disabled";
  return validation.mode;
}

/* ============================================================================
 * MODE A — single-anchor translate + drawing scale (ACTIVE RENDER PATH)
 * ==========================================================================*/

/**
 * Resolves the anchor actually used for MODE A rendering: prefers the first
 * configured control point (a real, specific pixel+geo pair) over the
 * legacy layout-level `gisAnchor` (which historically was just "the
 * lat/lng that corresponds to the bounding-box center" — workable, but not
 * tied to any specific identifiable feature). Returns null if neither
 * exists, rather than fabricating a position.
 */
export function resolveAnchor(): { worldX: number; worldY: number; lat: number; lng: number } | null {
  const points = getGisControlPoints();
  if (points.length > 0) {
    const cp = points[0];
    return {
      worldX: cp.pixel.x * 10,
      worldY: cp.pixel.y * 10,
      lat: cp.geo.latitude,
      lng: cp.geo.longitude,
    };
  }
  const anchor = getGisAnchor();
  if (!anchor) return null;
  // Legacy fallback: caller must supply the world point this anchor
  // corresponds to (historically the layout bounds center) via anchorWorld.
  return null;
}

/**
 * Converts a source world-space point to lat/lng using a single anchor
 * (world point <-> known geo point) plus the drawing scale. This is a
 * translate+scale transform with NO rotation: it assumes the source
 * drawing's axes are already aligned to true north/east. That assumption
 * is UNVERIFIED for Dokiparru until 3+ non-collinear control points
 * confirm it (see validateControlPoints/getEffectiveTransformMode) — do
 * not treat this as survey-grade.
 *
 * Returns null when no GIS anchor has been configured, rather than
 * fabricating a position.
 */
export function worldToLatLng(
  worldX: number,
  worldY: number,
  anchorWorld: AnchorWorld
): { lat: number; lng: number } | null {
  const anchor = getGisAnchor();
  if (!anchor) return null;

  const mPerDegLng = metersPerDegLng(anchor.lat);
  const dLat = ((worldY - anchorWorld.y) * DRAWING_SCALE_METERS_PER_WORLD_UNIT) / METERS_PER_DEG_LAT;
  const dLng = ((worldX - anchorWorld.x) * DRAWING_SCALE_METERS_PER_WORLD_UNIT) / mPerDegLng;

  return {
    lat: anchor.lat + dLat,
    lng: anchor.lng + dLng,
  };
}

export function metersPerPixelToZoom(metersPerPixel: number, lat: number): number {
  return Math.log2((156543.03392 * Math.cos((lat * Math.PI) / 180)) / metersPerPixel);
}

/* ============================================================================
 * MODE B — similarity/affine solve from control points (VALIDATION ONLY)
 * ==========================================================================*/

export interface SimilarityTransform {
  /** implied scale, in meters-per-world-unit, derived purely from control points (no drawing-scale assumption) */
  metersPerWorldUnit: number;
  /** implied rotation of the world axes relative to true north/east, in degrees (0 = drawing is north-up) */
  rotationDeg: number;
  fromPointIds: [string, string];
}

/**
 * Computes the scale + rotation implied by exactly two control points,
 * treating geo displacement as a local flat-earth (meters) projection.
 * This is diagnostic only (used by residual/consistency reporting) — it
 * is NOT used to render anything, per Phase 3B scope (no auto-activation
 * of multi-point transforms).
 */
export function computeImpliedSimilarity(a: ControlPoint, b: ControlPoint): SimilarityTransform {
  const worldDx = (b.pixel.x - a.pixel.x) * 10;
  const worldDy = (b.pixel.y - a.pixel.y) * 10;
  const worldDist = Math.hypot(worldDx, worldDy);

  const midLat = (a.geo.latitude + b.geo.latitude) / 2;
  const mPerDegLng = metersPerDegLng(midLat);
  const geoDx = (b.geo.longitude - a.geo.longitude) * mPerDegLng;
  const geoDy = (b.geo.latitude - a.geo.latitude) * METERS_PER_DEG_LAT;
  const geoDist = Math.hypot(geoDx, geoDy);

  const metersPerWorldUnit = worldDist > 0 ? geoDist / worldDist : NaN;

  // bearing of the geo displacement (from north, clockwise) minus bearing
  // of the world-space displacement (from world +y "down", clockwise) —
  // the difference is the implied rotation of the drawing's axes.
  const geoBearing = (Math.atan2(geoDx, geoDy) * 180) / Math.PI;
  const worldBearing = (Math.atan2(worldDx, worldDy) * 180) / Math.PI;
  const rotationDeg = ((geoBearing - worldBearing + 540) % 360) - 180;

  return { metersPerWorldUnit, rotationDeg, fromPointIds: [a.id, b.id] };
}

/**
 * Compares the drawing's printed-dimension-derived scale against the
 * scale implied by real control points. Use this as a sanity check, not a
 * source of truth once 2+ control points exist — control-point evidence
 * should win over the drawing scale, and a large discrepancy here means
 * the drawing scale assumption (or a control point) is wrong.
 */
export function compareDrawingScaleToControlPoints(): Array<{
  pairIds: [string, string];
  drawingScale: number;
  controlPointScale: number;
  percentDifference: number;
  rotationDeg: number;
}> {
  const points = getGisControlPoints();
  const results: Array<{
    pairIds: [string, string];
    drawingScale: number;
    controlPointScale: number;
    percentDifference: number;
    rotationDeg: number;
  }> = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const sim = computeImpliedSimilarity(points[i], points[j]);
      if (!Number.isFinite(sim.metersPerWorldUnit)) continue;
      const pct =
        ((sim.metersPerWorldUnit - DRAWING_SCALE_METERS_PER_WORLD_UNIT) /
          DRAWING_SCALE_METERS_PER_WORLD_UNIT) *
        100;
      results.push({
        pairIds: sim.fromPointIds,
        drawingScale: DRAWING_SCALE_METERS_PER_WORLD_UNIT,
        controlPointScale: sim.metersPerWorldUnit,
        percentDifference: pct,
        rotationDeg: sim.rotationDeg,
      });
    }
  }
  return results;
}

/* ============================================================================
 * RESIDUALS
 * ==========================================================================*/

/**
 * For every configured control point, computes what the CURRENTLY ACTIVE
 * render-path transform (MODE A: single-anchor + drawing scale) predicts
 * for its lat/lng, versus the control point's own supplied geo coordinate.
 * Reports both angular (degrees) and approximate local-meter error.
 *
 * With exactly 1 control point (used as the anchor itself) this is
 * trivially ~0 by construction — it becomes meaningful once 2+ independent
 * control points exist and are checked against the single-anchor
 * prediction. Large residuals here mean MODE A's no-rotation/drawing-scale
 * assumptions do not hold and MODE A should not be trusted for those
 * points.
 */
export function computeControlPointResiduals(anchorWorld: AnchorWorld): ControlPointResidual[] {
  const points = getGisControlPoints();
  const results: ControlPointResidual[] = [];
  for (const cp of points) {
    const worldX = cp.pixel.x * 10;
    const worldY = cp.pixel.y * 10;
    const transformed = worldToLatLng(worldX, worldY, anchorWorld);
    if (!transformed) {
      results.push({
        id: cp.id,
        label: cp.label,
        pixel: cp.pixel,
        geo: cp.geo,
        transformed: null,
        latErrorDeg: null,
        lngErrorDeg: null,
        residualMeters: null,
      });
      continue;
    }
    const latErrorDeg = transformed.lat - cp.geo.latitude;
    const lngErrorDeg = transformed.lng - cp.geo.longitude;
    const dy = latErrorDeg * METERS_PER_DEG_LAT;
    const dx = lngErrorDeg * metersPerDegLng(cp.geo.latitude);
    results.push({
      id: cp.id,
      label: cp.label,
      pixel: cp.pixel,
      geo: cp.geo,
      transformed,
      latErrorDeg,
      lngErrorDeg,
      residualMeters: Math.sqrt(dx * dx + dy * dy),
    });
  }
  return results;
}
