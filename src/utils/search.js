/**
 * Case-insensitive, whitespace-trimmed match against a list of fields pulled
 * off a record. Used by every employee module search box so behavior (and
 * scope safety — this only ever runs against an already-scoped list) stays
 * consistent across Verifications/Properties/Enquiries search.
 */
export function matchesSearch(record, term, fieldGetters) {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return fieldGetters.some((getter) => {
    const value = typeof getter === 'function' ? getter(record) : record[getter];
    return String(value ?? '').toLowerCase().includes(needle);
  });
}
