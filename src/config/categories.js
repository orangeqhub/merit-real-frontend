/**
 * Property categories helpers — prefer categoryService for live data.
 * Kept for sync lookups after CategoryStrip / listing hydrate the cache.
 */
import { categoryService } from '../services/categoryService';

export const CATEGORIES = [];

export function getCategoryBySlug(slug) {
  const cached = categoryService.getCached();
  return cached.find((c) => c.slug === slug) || CATEGORIES.find((c) => c.slug === slug) || null;
}

export function getCategoryByRuleKey(ruleKey) {
  const cached = categoryService.getCached();
  return cached.find((c) => c.ruleKey === ruleKey) || CATEGORIES.find((c) => c.ruleKey === ruleKey) || null;
}
