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

function createRoleService(basePath) {
  return {
    async list(params = {}) {
      const data = await api(`${basePath}${buildQuery(params)}`, { token: getAccessToken() });
      return mapList(data);
    },
    async getById(id) {
      const user = await api(`${basePath}/${id}`, { token: getAccessToken() });
      return mapApiUserToUi(user);
    },
    async create(payload) {
      const user = await api(basePath, {
        method: 'POST',
        token: getAccessToken(),
        body: payload,
      });
      return mapApiUserToUi(user);
    },
    async update(id, payload) {
      const user = await api(`${basePath}/${id}`, {
        method: 'PATCH',
        token: getAccessToken(),
        body: payload,
      });
      return mapApiUserToUi(user);
    },
    async remove(id) {
      return api(`${basePath}/${id}`, {
        method: 'DELETE',
        token: getAccessToken(),
      });
    },
  };
}

export const customerService = createRoleService('/customers');
export const agentService = createRoleService('/agents');
export const salesMemberService = createRoleService('/sales-members');
