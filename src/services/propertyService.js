import { api, resolveAssetUrl } from '../api/client';
import { getAccessToken } from '../api/session';
import { readJSON, writeJSON, STORAGE_KEYS } from '../utils/storage';

function getLocalFavouriteIds() {
  const ids = readJSON(STORAGE_KEYS.WISHLIST, []);
  return Array.isArray(ids) ? ids.map(Number).filter(Boolean) : [];
}

function setLocalFavouriteIds(ids) {
  const next = Array.isArray(ids) ? ids.map(Number).filter(Boolean) : [];
  writeJSON(STORAGE_KEYS.WISHLIST, next);
  return next;
}

/** Normalize every media URL on a property so UI never sees your_server_ip. */
function normalizePropertyMedia(property) {
  if (!property || typeof property !== 'object') return property;

  const images = Array.isArray(property.images)
    ? property.images.map((img) =>
        img && typeof img === 'object'
          ? { ...img, url: resolveAssetUrl(img.url || img.path || img.imagePath || '') }
          : img
      )
    : property.images;

  return {
    ...property,
    images,
    image: property.image != null ? resolveAssetUrl(property.image) : property.image,
    thumbnail: property.thumbnail != null ? resolveAssetUrl(property.thumbnail) : property.thumbnail,
    coverImage: property.coverImage != null ? resolveAssetUrl(property.coverImage) : property.coverImage,
  };
}

function normalizePropertyList(items) {
  return (Array.isArray(items) ? items : []).map(normalizePropertyMedia);
}

import { NEARBY_RADIUS_KM } from '../config/location';

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '' || value === false) return;
    if (['viewer', 'scopeMode', 'admin', 'silent', 'token'].includes(key)) return;
    if (typeof value === 'object') return;
    query.set(key, String(value));
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

function normalizeList(data, params = {}) {
  if (Array.isArray(data)) {
    const items = normalizePropertyList(data);
    return {
      items,
      total: items.length,
      page: params.page || 1,
      pageSize: params.pageSize || items.length || 20,
      totalPages: 1,
    };
  }
  return {
    items: normalizePropertyList(data?.items || []),
    total: data?.total || 0,
    page: data?.page || params.page || 1,
    pageSize: data?.pageSize || params.pageSize || 20,
    totalPages: data?.totalPages || 1,
  };
}

function appendFormValue(formData, key, value) {
  if (value == null || value === '') return;
  if (typeof value === 'boolean') {
    formData.append(key, value ? 'true' : 'false');
    return;
  }
  if (typeof value === 'object') {
    formData.append(key, JSON.stringify(value));
    return;
  }
  formData.append(key, String(value));
}

function buildPropertyFormData(payload = {}, imageFiles = []) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'images' || key === 'imageFiles') return;
    appendFormValue(formData, key, value);
  });
  (imageFiles || []).forEach((file) => {
    if (file) formData.append('images', file);
  });
  return formData;
}

export const propertyService = {
  async getProperties(params = {}) {
    // Admin-only endpoint — never call from customer/agent portals
    const useAdmin = params.admin === true;
    const queryParams = { ...params };
    if (queryParams.latitude != null && queryParams.longitude != null) {
      queryParams.radiusKm = queryParams.radiusKm ?? NEARBY_RADIUS_KM;
    }
    const path = useAdmin
      ? `/properties/admin/all${buildQuery({ ...queryParams, includeAllStatuses: queryParams.includeAllStatuses ?? true })}`
      : `/properties${buildQuery(queryParams)}`;
    const options = useAdmin || params.token
      ? { token: getAccessToken(), silent: params.silent ?? useAdmin }
      : { silent: params.silent };
    try {
      const data = await api(path, options);
      return normalizeList(data, params);
    } catch (err) {
      if (useAdmin && (err?.status === 401 || err?.status === 403)) {
        // Wrong portal session — return empty instead of throwing repeatedly.
        return normalizeList({ items: [], total: 0 }, params);
      }
      throw err;
    }
  },

  async getPropertyById(id) {
    try {
      const property = await api(`/properties/${id}`);
      return normalizePropertyMedia(property);
    } catch {
      return null;
    }
  },

  async getFeatured(limit = 8, location, geo = {}) {
    const q = buildQuery({
      limit,
      location,
      latitude: geo.latitude,
      longitude: geo.longitude,
      radiusKm: geo.radiusKm,
    });
    const data = await api(`/properties/featured${q}`, { silent: true });
    return Array.isArray(data) ? normalizePropertyList(data) : data;
  },

  async getLatest(limit = 8, location, geo = {}) {
    const q = buildQuery({
      limit,
      location,
      latitude: geo.latitude,
      longitude: geo.longitude,
      radiusKm: geo.radiusKm,
    });
    const data = await api(`/properties/latest${q}`, { silent: true });
    return Array.isArray(data) ? normalizePropertyList(data) : data;
  },

  async getTrending(limit = 8, location, geo = {}) {
    const q = buildQuery({
      limit,
      location,
      latitude: geo.latitude,
      longitude: geo.longitude,
      radiusKm: geo.radiusKm,
    });
    const data = await api(`/properties/trending${q}`, { silent: true });
    return Array.isArray(data) ? normalizePropertyList(data) : data;
  },

  async getRelated(property, limit = 4) {
    if (!property?.id) return [];
    const data = await api(`/properties/${property.id}/related${buildQuery({ limit })}`, { silent: true });
    return Array.isArray(data) ? normalizePropertyList(data) : [];
  },

  async recordView(id) {
    try {
      await api(`/properties/${id}/view`, { method: 'POST', silent: true });
    } catch {
      // ignore view errors
    }
    return true;
  },

  async getRecentlyViewed() {
    return [];
  },

  async toggleFavourite(_userId, propertyId) {
    const id = Number(propertyId);
    if (!id) return getLocalFavouriteIds();
    const current = getLocalFavouriteIds();
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    return setLocalFavouriteIds(next);
  },

  async getFavourites() {
    const ids = getLocalFavouriteIds();
    if (!ids.length) return [];
    const properties = await Promise.all(
      ids.map(async (id) => {
        try {
          return await propertyService.getPropertyById(id);
        } catch {
          return null;
        }
      })
    );
    return properties.filter(Boolean);
  },

  async getFavouriteIds() {
    return getLocalFavouriteIds();
  },

  async createProperty(payload, imageFiles = []) {
    const formData = buildPropertyFormData(payload, imageFiles);
    const created = await api('/properties', {
      method: 'POST',
      token: getAccessToken(),
      formData,
    });
    return normalizePropertyMedia(created);
  },

  async updateProperty(id, payload, imageFiles = []) {
    const formData = buildPropertyFormData(payload, imageFiles);
    const updated = await api(`/properties/${id}`, {
      method: 'PATCH',
      token: getAccessToken(),
      formData,
    });
    return normalizePropertyMedia(updated);
  },

  async createDraft() {
    throw new Error('Customer/Agent property posting is not enabled yet');
  },

  async updateDraft() {
    throw new Error('Customer/Agent property posting is not enabled yet');
  },

  async submitForApproval() {
    throw new Error('Customer/Agent property posting is not enabled yet');
  },

  async getBySeller() {
    return [];
  },

  async moderate() {
    throw new Error('Property moderation workflow is not enabled in Phase 1');
  },

  async deleteProperty(id) {
    return api(`/properties/${id}`, {
      method: 'DELETE',
      token: getAccessToken(),
    });
  },

  async assignRecord() {
    throw new Error('Property assignment is not enabled in Phase 1');
  },

  async isUsedByAnyProperty(categorySlug) {
    const data = await this.getProperties({ categorySlug, pageSize: 1, includeAllStatuses: true, admin: true });
    return (data.total || 0) > 0;
  },
};
