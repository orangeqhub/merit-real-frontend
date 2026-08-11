import { api } from '../api/client';
import { getAccessToken } from '../api/session';

export const heroSlideService = {
  /** Public website carousel */
  async listActive() {
    return api('/hero-slides', { silent: true });
  },

  /** Admin full list */
  async listAll() {
    return api('/hero-slides/all', { token: getAccessToken() });
  },

  async create(formValues, imageFile) {
    const formData = new FormData();
    if (imageFile) formData.append('image', imageFile);
    Object.entries(formValues).forEach(([key, value]) => {
      if (value != null && value !== '') formData.append(key, value);
    });
    return api('/hero-slides', {
      method: 'POST',
      token: getAccessToken(),
      formData,
    });
  },

  async update(id, formValues, imageFile) {
    const formData = new FormData();
    if (imageFile) formData.append('image', imageFile);
    Object.entries(formValues).forEach(([key, value]) => {
      if (value != null) formData.append(key, value);
    });
    return api(`/hero-slides/${id}`, {
      method: 'PATCH',
      token: getAccessToken(),
      formData,
    });
  },

  async remove(id) {
    return api(`/hero-slides/${id}`, {
      method: 'DELETE',
      token: getAccessToken(),
    });
  },
};
