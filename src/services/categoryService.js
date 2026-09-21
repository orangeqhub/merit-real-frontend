import { api } from '../api/client';
import { getAccessToken } from '../api/session';
import { MEDIA_RULE_KEYS } from '../config/propertyMediaRules';

let cache = null;

export const categoryService = {
  async getCategories() {
    try {
      const data = await api('/property-categories/all?includeAttributes=true', {
        token: getAccessToken(),
        silent: true,
      });
      cache = Array.isArray(data) ? data : [];
      return cache;
    } catch (err) {
      // Non-admin sessions must not spam 403s — fall back to public categories.
      if (err?.status === 401 || err?.status === 403) {
        return this.getPublicCategories();
      }
      throw err;
    }
  },

  async getPublicCategories() {
    const data = await api('/property-categories', { silent: true });
    cache = Array.isArray(data) ? data : [];
    return cache;
  },

  async getCategoryBySlug(slug) {
    return api(`/property-categories/${slug}`);
  },

  async createCategory(payload) {
    return api('/property-categories', {
      method: 'POST',
      token: getAccessToken(),
      body: payload,
    });
  },

  async updateCategory(slug, payload) {
    return api(`/property-categories/${slug}`, {
      method: 'PATCH',
      token: getAccessToken(),
      body: payload,
    });
  },

  async deleteCategory(slug) {
    return api(`/property-categories/${slug}`, {
      method: 'DELETE',
      token: getAccessToken(),
    });
  },

  async reorder(slug, direction) {
    return api(`/property-categories/${slug}/reorder`, {
      method: 'POST',
      token: getAccessToken(),
      body: { direction },
    });
  },

  async getMediaRuleKeys() {
    return MEDIA_RULE_KEYS;
  },

  getCached() {
    return cache || [];
  },
};
