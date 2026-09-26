/**
 * One MapPlots record per plot identity (layout is already implied by the
 * per-layout API call; identity = phase + plot number).
 *
 * Some layouts still hold two DB rows for one printed plot number (e.g. Sri
 * Lakshmi's duplicate-polygon rows). The Plot Board and every native map must
 * show the SAME row for that plot, so all of them pick it with this rule: the
 * most recently written row (what the last Excel import / booking touched),
 * then the lowest id. The backend importer writes every row of an identity,
 * so after an import all of them agree anyway.
 */

/** "1|24", "2|135", "1|67&68" -- "024" and "24" are the same plot. */
export function plotRecordKey(phase, plotNo) {
  const text = String(plotNo ?? '').trim().toLowerCase();
  const no = /^\d+$/.test(text) ? String(Number(text)) : text;
  return `${Number(phase) === 2 ? 2 : 1}|${no}`;
}

function isPreferred(candidate, current) {
  const a = Date.parse(candidate?.updatedAt || '') || 0;
  const b = Date.parse(current?.updatedAt || '') || 0;
  if (a !== b) return a > b;
  return Number(candidate?.id || 0) < Number(current?.id || 0);
}

/** Map of plotRecordKey -> the canonical API row for that plot. */
export function canonicalPlotRecords(rows) {
  const byKey = new Map();
  for (const row of rows || []) {
    if (row?.plotNo == null || String(row.plotNo).trim() === '') continue;
    const key = plotRecordKey(row.phase, row.plotNo);
    const current = byKey.get(key);
    if (!current || isPreferred(row, current)) byKey.set(key, row);
  }
  return byKey;
}
