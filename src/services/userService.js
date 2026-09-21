import { api } from '../api/client';
import { getAccessToken, getCachedUser, saveSession } from '../api/session';
import { mapApiUserToUi } from '../utils/userMapper';
import { agentService, customerService, salesMemberService } from './managedUserService';

function normalizeRole(role) {
  const value = String(role || '').toLowerCase();
  if (value === 'mediator') return 'agent';
  if (value === 'buyer') return 'customer';
  return value;
}

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'approved') return 'ACTIVE';
  if (value === 'pending') return 'PENDING';
  if (value === 'inactive') return 'INACTIVE';
  if (value === 'rejected') return 'REJECTED';
  return status ? String(status).toUpperCase() : undefined;
}

async function listRole(service, params = {}) {
  const data = await service.list({
    page: 1,
    pageSize: Math.min(Number(params.pageSize) || 100, 200),
    search: params.search || undefined,
    status: normalizeStatus(params.status),
    sortBy: 'createdAt',
    sortDir: 'DESC',
  });
  return data.items || [];
}

export const userService = {
  async getUsers(params = {}) {
    const role = normalizeRole(params.role);
    try {
      if (role === 'agent' || role === 'employee') {
        // Employee portal is not a separate API role; agents cover assignment dropdowns.
        return listRole(agentService, params);
      }
      if (role === 'customer') {
        return listRole(customerService, params);
      }
      if (role === 'sales_member') {
        return listRole(salesMemberService, params);
      }

      const [customers, agents, salesMembers] = await Promise.all([
        listRole(customerService, params).catch(() => []),
        listRole(agentService, params).catch(() => []),
        listRole(salesMemberService, params).catch(() => []),
      ]);
      return [...customers, ...agents, ...salesMembers];
    } catch {
      return [];
    }
  },

  async getUserById(id) {
    if (!id) return null;
    const token = getAccessToken();
    try {
      const user = await api(`/customers/${id}`, { token });
      return mapApiUserToUi(user);
    } catch {
      try {
        const user = await api(`/agents/${id}`, { token });
        return mapApiUserToUi(user);
      } catch {
        return null;
      }
    }
  },

  async updateUser(_id, payload = {}) {
    const token = getAccessToken();
    const cached = getCachedUser();

    // Preferences are still client-side until a dedicated settings API exists.
    const preferenceOnly = Boolean(payload.preferences)
      && payload.name == null
      && payload.email == null
      && payload.address == null
      && payload.occupation == null;

    if (preferenceOnly) {
      const next = { ...(cached || {}), preferences: payload.preferences };
      if (token) saveSession({ token, user: next }, true);
      return next;
    }

    try {
      const data = await api('/auth/me', {
        method: 'PATCH',
        token,
        body: {
          name: payload.name,
          email: payload.email,
          address: payload.address,
          occupation: payload.occupation,
          referralAgentCode: payload.referralAgentCode,
          referralAgentId: payload.referralAgentId,
          clearReferralAgent: payload.clearReferralAgent,
        },
      });
      const user = mapApiUserToUi(data);
      const next = {
        ...user,
        preferences: payload.preferences || cached?.preferences || user.preferences,
        altMobile: payload.altMobile != null ? payload.altMobile : (cached?.altMobile || ''),
      };
      if (token) saveSession({ token, user: next }, true);
      return next;
    } catch (err) {
      throw new Error(err.message || 'Failed to update profile');
    }
  },

  async setStatus() {
    throw new Error('Use Customers / Agents management to change user status.');
  },
  async createEmployee() {
    throw new Error('Use Agents management to create agent accounts.');
  },
  async updatePermissions() {
    throw new Error('Permission updates are not available for this role.');
  },
  async setEmployeeStatus() {
    throw new Error('Use Agents management to change agent status.');
  },
  async assignMediator() {
    throw new Error('Assign agents from Express Interests / Enquiries.');
  },
};
