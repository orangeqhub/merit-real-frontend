import { api } from '../api/client';
import { getAccessToken } from '../api/session';

function token() {
  return getAccessToken();
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data?.items) return data.items;
  return [];
}

export const notificationService = {
  async getForUser() {
    const authToken = token();
    // Local employee demo sessions have no API JWT — avoid 401 spam.
    if (!authToken) return [];
    const data = await api('/notifications?pageSize=50', { token: authToken, silent: true });
    return normalizeList(data);
  },

  async getUnreadCount() {
    const authToken = token();
    if (!authToken) return 0;
    const data = await api('/notifications/unread-count', { token: authToken, silent: true });
    return data?.count ?? 0;
  },

  async create() {
    // Notifications are created server-side only
    return null;
  },

  async markRead(id) {
    const authToken = token();
    if (!authToken) return null;
    return api(`/notifications/${id}/read`, { method: 'PATCH', token: authToken, silent: true });
  },

  async markAllRead() {
    const authToken = token();
    if (!authToken) return null;
    return api('/notifications/read-all', { method: 'POST', token: authToken, silent: true });
  },

  async remove(id) {
    const authToken = token();
    if (!authToken) return null;
    return api(`/notifications/${id}`, { method: 'DELETE', token: authToken });
  },
};
