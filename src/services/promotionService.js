import { api } from '../api/client';
import { getAccessToken } from '../api/session';

export const PROMOTION_TYPES = [
  { value: 'TRENDING_PROPERTY', label: 'Trending Property' },
  { value: 'FEATURED_PROPERTY', label: 'Featured Property' },
  { value: 'HOT_PROPERTY', label: 'Hot Property' },
  { value: 'LIMITED_TIME_OFFER', label: 'Limited Time Offer' },
  { value: 'NEW_LAUNCH', label: 'New Launch' },
  { value: 'PREMIUM_LISTING', label: 'Premium Listing' },
  { value: 'FESTIVAL_OFFER', label: 'Festival Offer' },
];

export const promotionService = {
  async listActive() {
    const token = getAccessToken();
    return api('/promotions/active', { silent: true, ...(token ? { token } : {}) });
  },

  async listAll() {
    return api('/promotions', { token: getAccessToken() });
  },

  async getById(id) {
    return api(`/promotions/${id}`, { token: getAccessToken() });
  },

  async create(formValues, bannerFile) {
    const formData = new FormData();
    if (bannerFile) formData.append('banner', bannerFile);
    Object.entries(formValues).forEach(([key, value]) => {
      if (value == null || value === '') return;
      if (key === 'propertyIds' && Array.isArray(value)) {
        formData.append('propertyIds', JSON.stringify(value));
        return;
      }
      formData.append(key, value);
    });
    return api('/promotions', {
      method: 'POST',
      token: getAccessToken(),
      formData,
    });
  },

  async update(id, formValues, bannerFile) {
    const formData = new FormData();
    if (bannerFile) formData.append('banner', bannerFile);
    Object.entries(formValues).forEach(([key, value]) => {
      if (value === undefined) return;
      if (value === null) {
        formData.append(key, '');
        return;
      }
      if (key === 'propertyIds' && Array.isArray(value)) {
        formData.append('propertyIds', JSON.stringify(value));
        return;
      }
      formData.append(key, value);
    });
    return api(`/promotions/${id}`, {
      method: 'PATCH',
      token: getAccessToken(),
      formData,
    });
  },

  async remove(id) {
    return api(`/promotions/${id}`, {
      method: 'DELETE',
      token: getAccessToken(),
    });
  },

  async activate(id) {
    return api(`/promotions/${id}/activate`, {
      method: 'POST',
      token: getAccessToken(),
    });
  },

  async deactivate(id) {
    return api(`/promotions/${id}/deactivate`, {
      method: 'POST',
      token: getAccessToken(),
    });
  },

  async myPromotions(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    const qs = q.toString();
    return api(`/promotions/mine${qs ? `?${qs}` : ''}`, { token: getAccessToken() });
  },

  async dismissed(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    const qs = q.toString();
    return api(`/promotions/dismissed${qs ? `?${qs}` : ''}`, { token: getAccessToken() });
  },

  async dismiss(id) {
    return api(`/promotions/${id}/dismiss`, {
      method: 'POST',
      token: getAccessToken(),
    });
  },

  async restore(id) {
    return api(`/promotions/${id}/restore`, {
      method: 'POST',
      token: getAccessToken(),
    });
  },
};
