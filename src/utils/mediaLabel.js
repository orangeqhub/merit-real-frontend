/**
 * Resolves a display label for a media slot / extra feature, preferring an
 * admin-set labelEn/labelTe override and falling back to the i18n labelKey.
 */
export function resolveSlotLabel(slot, language, t, index) {
  const override = language === 'te' ? slot.labelTe : slot.labelEn;
  if (override) {
    return index ? `${override} ${index}` : override;
  }
  if (slot.labelKey) {
    return t(slot.labelKey, { ns: 'forms', index: index ?? '' }).trim();
  }
  return slot.id;
}
