import { api } from '../api/client';
import { getAccessToken } from '../api/session';

function token() {
  return getAccessToken();
}

export const siteSettingsService = {
  async getPublic() {
    return api('/site-settings', { silent: true });
  },

  async get() {
    return api('/site-settings', { token: token() });
  },

  async update(payload) {
    return api('/site-settings', {
      method: 'PUT',
      token: token(),
      body: payload,
    });
  },
};

/** Back-compat for older Settings page imports */
export const settingsService = {
  async getSettings() {
    return siteSettingsService.get();
  },
  async updateSettings(payload) {
    return siteSettingsService.update(payload);
  },
};
