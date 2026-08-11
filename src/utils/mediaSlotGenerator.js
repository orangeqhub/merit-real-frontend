/**
 * Generates the ordered list of image upload slots for a property, driven
 * entirely by declared structure counts and explicitly-added extra spaces.
 * There is no generic "add more images" escape hatch — a new slot only ever
 * appears after the seller increases a structural count or adds a feature.
 *
 * `rule` must be the resolved rule object for the property's category, as
 * returned by mediaRuleService.getRules()[ruleKey] — this function never
 * reads rule configuration itself, keeping mediaRuleService the single
 * source of truth the seller wizard and admin editor both read through.
 *
 * @param {object} rule - { commonSlots, countBasedSlots, allowedExtraSpaces }
 * @param {Record<string, number>} structureCounts - e.g. { bedrooms: 3, bathrooms: 3 }
 * @param {{key: string, qty: number}[]} extraSpaces - seller-declared extra features
 */
export function generateImageSlots(rule, structureCounts = {}, extraSpaces = []) {
  if (!rule) return [];
  const slots = [];

  for (const slot of [...rule.commonSlots].sort((a, b) => a.order - b.order)) {
    slots.push({
      id: slot.id,
      labelKey: slot.labelKey,
      labelEn: slot.labelEn,
      labelTe: slot.labelTe,
      required: slot.required,
      group: 'common',
      index: null,
      maxFileSizeMb: slot.maxFileSizeMb,
      allowedExtensions: slot.allowedExtensions,
      captionRequired: slot.captionRequired,
      primaryEligible: slot.primaryEligible,
    });
  }

  for (const [field, cfg] of Object.entries(rule.countBasedSlots)) {
    const count = Number(structureCounts[field]) || 0;
    for (let i = 1; i <= count; i += 1) {
      slots.push({
        id: `${field}-${i}`,
        labelKey: cfg.groupLabelKey,
        labelEn: cfg.groupLabelEn,
        labelTe: cfg.groupLabelTe,
        required: cfg.required,
        group: field,
        index: i,
        maxFileSizeMb: cfg.maxFileSizeMb,
        allowedExtensions: cfg.allowedExtensions,
        captionRequired: cfg.captionRequired,
        primaryEligible: cfg.primaryEligible,
      });
    }
  }

  for (const extraDeclared of extraSpaces) {
    const allowed = rule.allowedExtraSpaces.find((e) => e.key === extraDeclared.key);
    if (!allowed) continue;
    const qty = Number(extraDeclared.qty) || 0;
    for (let i = 1; i <= qty; i += 1) {
      slots.push({
        id: `extra-${extraDeclared.key}-${i}`,
        labelKey: allowed.labelKey,
        labelEn: allowed.labelEn,
        labelTe: allowed.labelTe,
        required: false,
        group: `extra-${extraDeclared.key}`,
        index: i,
        maxFileSizeMb: 5,
        allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
        captionRequired: false,
        primaryEligible: true,
      });
    }
  }

  return slots;
}
