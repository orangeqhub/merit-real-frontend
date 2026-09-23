import plotIdentityAuditJson from "../layouts/dokiparru/plotIdentityAudit.json";

export interface AuditEntry {
  geometryId: string;
  candidatePlotNumber: number;
  verifiedPlotNumber: number | null;
  status: "verified" | "needs-review";
  confidence: "high" | "low";
  note: string;
  extentSqYd: number | null;
}

const auditRaw = plotIdentityAuditJson as unknown as AuditEntry[];
const auditById = new Map<string, AuditEntry>(auditRaw.map((e) => [e.geometryId, e]));

export function getAuditEntry(geometryId: string): AuditEntry | undefined {
  return auditById.get(geometryId);
}

export function needsReview(geometryId: string): boolean {
  return auditById.get(geometryId)?.status === "needs-review";
}
