import { api } from '../api/client';
import { getAccessToken } from '../api/session';
import { mapApiUserToUi } from '../utils/userMapper';

function mapList(data) {
  const payload = data || {};
  const items = Array.isArray(payload.items) ? payload.items.map(mapApiUserToUi) : [];
  return {
    items,
    total: payload.total || 0,
    page: payload.page || 1,
    pageSize: payload.pageSize || 10,
    totalPages: payload.totalPages || 1,
  };
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') query.set(key, String(value));
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

function cleanPayload(payload = {}) {
  const next = { ...payload };
  if (next.password === '' || next.password == null) {
    delete next.password;
  }
  return next;
}

/**
 * Admin employee CRUD against merit-api /employees (PostgreSQL).
 */
export const employeeService = {
  async list(params = {}) {
    const data = await api(`/employees${buildQuery(params)}`, { token: getAccessToken() });
    return mapList(data);
  },

  async getById(id) {
    const user = await api(`/employees/${id}`, { token: getAccessToken() });
    return mapApiUserToUi(user);
  },

  async create(payload) {
    const user = await api('/employees', {
      method: 'POST',
      token: getAccessToken(),
      body: cleanPayload(payload),
    });
    return mapApiUserToUi(user);
  },

  async update(id, payload) {
    const user = await api(`/employees/${id}`, {
      method: 'PATCH',
      token: getAccessToken(),
      body: cleanPayload(payload),
    });
    return mapApiUserToUi(user);
  },

  async updatePermissions(id, permissions) {
    return this.update(id, { permissions });
  },

  async remove(id) {
    return api(`/employees/${id}`, {
      method: 'DELETE',
      token: getAccessToken(),
    });
  },
};
