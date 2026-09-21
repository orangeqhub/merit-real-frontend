/**
 * Resolves bilingual CMS/property fields stored as `${field}En` / `${field}Te`,
 * falling back to English when the Telugu value is missing.
 */
export function getLocalizedField(obj, field, lang) {
  if (!obj) return '';
  if (lang === 'te') {
    const teValue = obj[`${field}Te`];
    if (teValue) return teValue;
  }
  return obj[`${field}En`] ?? '';
}
