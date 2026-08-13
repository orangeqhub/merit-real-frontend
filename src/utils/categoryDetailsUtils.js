import { emptyCategoryDetails } from './propertyCategoryFieldConfig';

export function resolveCategorySlug(categories, categoryId) {
  if (!categoryId) return '';
  const cat = (categories || []).find((c) => String(c.id) === String(categoryId));
  return cat?.slug || '';
}

/** Load category details for edit — preserves per-slug archive when switching categories. */
export function loadCategoryDetailsFromProperty(property, categorySlug) {
  const detailsJson = property?.detailsJson || {};
  const bySlug = detailsJson.categoryDetailsBySlug || {};
  const legacy = detailsJson.categoryDetails || property?.categoryDetails || {};

  if (categorySlug && bySlug[categorySlug] && Object.keys(bySlug[categorySlug]).length) {
    return { ...emptyCategoryDetails(categorySlug), ...bySlug[categorySlug] };
  }
  if (categorySlug === property?.categorySlug && legacy && Object.keys(legacy).length) {
    return { ...emptyCategoryDetails(categorySlug), ...legacy };
  }
  // Legacy plotDetails / structure fallbacks for older records
  const merged = { ...emptyCategoryDetails(categorySlug) };
  if (property?.plotDetails) Object.assign(merged, property.plotDetails);
  if (property?.structure) Object.assign(merged, property.structure);
  return merged;
}

export function buildCategoryDetailsPayload(categorySlug, categoryDetails, existingDetailsJson = {}) {
  const bySlug = {
    ...(existingDetailsJson.categoryDetailsBySlug || {}),
    ...(categorySlug ? { [categorySlug]: categoryDetails || {} } : {}),
  };

  return {
    categoryDetails: categorySlug ? (categoryDetails || {}) : {},
    categoryDetailsBySlug: bySlug,
  };
}
