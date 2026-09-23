// Type-only import: erased at compile time, so this does not create a real
// runtime circular dependency with layouts/index.ts (which calls into this
// module to build its authoritative plot list).
import type { LayoutPlotNumberEntry } from "../layouts";

/**
 * Single authoritative source for plot geometry <-> plot number identity.
 *
 * Background: plotNumberMapping.json's plotNumber field was originally
 * assigned by scan/row order during digitization, not by reading the
 * printed number, and a subset of the 279 digitized objects are duplicate/
 * overlapping polygons rather than distinct physical plots (see
 * layoutGeometryAudit.json for the full investigation and evidence).
 *
 * This module is the ONLY place that reconciles raw geometry against that
 * audit. Every consumer (rendering, search, hover, click, counts) must go
 * through getGenuinePlots() rather than reading plotNumberMapping.json
 * directly, so there is never a second competing source of plot identity.
 */

export type GeometryType = "plot" | "duplicate-polygon";
export type GeometryStatus = "verified" | "needs-manual-review" | "excluded";

export interface GeometryAuditEntry {
  geometryId: string;
  geometryType: GeometryType;
  plotNumber: string | null;
  status: GeometryStatus;
  verificationMethod?: string;
  note?: string;
}

export interface VerifiedEntry {
  plotNumber: string;
  verified: true;
  verificationMethod: string;
}

import geometryAuditJson from "../layouts/sri-lakshmi/layoutGeometryAudit.json";
import verifiedJson from "../layouts/sri-lakshmi/plotNumberMapping.verified.json";

const geometryAuditRaw = geometryAuditJson as unknown as GeometryAuditEntry[];
const verifiedRaw = verifiedJson as unknown as Record<string, VerifiedEntry>;

const auditById = new Map<string, GeometryAuditEntry>(
  geometryAuditRaw.map((e) => [e.geometryId, e])
);

/** True if this geometry is a duplicate/overlapping digitization artifact
 *  that must never behave as an independent, interactive plot. */
export function isDuplicatePolygon(geometryId: string): boolean {
  return auditById.get(geometryId)?.geometryType === "duplicate-polygon";
}

/** Verified (human-confirmed against the reference photo) plot number for
 *  this geometry, or null if not yet verified. Never fabricated. */
export function getVerifiedPlotNumber(geometryId: string): string | null {
  return verifiedRaw[geometryId]?.plotNumber ?? null;
}

export function getGeometryAuditEntry(geometryId: string): GeometryAuditEntry | undefined {
  return auditById.get(geometryId);
}

/**
 * The authoritative plot list: excludes duplicate-polygon artifacts,
 * applies verified plotNumber corrections where available, and otherwise
 * keeps the existing (unverified) number as a clearly-provisional value
 * rather than fabricating one. This is what every map consumer should use
 * instead of the raw plotNumberMapping.json array.
 */
export function getGenuinePlots(
  rawMapping: LayoutPlotNumberEntry[]
): LayoutPlotNumberEntry[] {
  return rawMapping
    .filter((p) => !isDuplicatePolygon(p.id))
    .map((p) => {
      const verified = getVerifiedPlotNumber(p.id);
      if (verified && verified !== String(p.plotNumber)) {
        // Match the original data's type (string), just with the corrected
        // value, so no downstream consumer sees a type it doesn't expect.
        return { ...p, plotNumber: verified as unknown as typeof p.plotNumber };
      }
      return p;
    });
}

export function getDuplicatePolygonIds(): string[] {
  return geometryAuditRaw
    .filter((e) => e.geometryType === "duplicate-polygon")
    .map((e) => e.geometryId);
}

export function getGeometryClassificationSummary() {
  const plots = geometryAuditRaw.filter((e) => e.geometryType === "plot");
  const duplicates = geometryAuditRaw.filter((e) => e.geometryType === "duplicate-polygon");
  return {
    totalGeometries: geometryAuditRaw.length,
    genuinePlots: plots.length,
    duplicatePolygons: duplicates.length,
    verified: geometryAuditRaw.filter((e) => e.status === "verified").length,
    needsManualReview: geometryAuditRaw.filter((e) => e.status === "needs-manual-review").length,
  };
}
