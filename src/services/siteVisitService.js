import { api } from '../api/client';
import { getAccessToken } from '../api/session';

function token() {
  return getAccessToken();
}

export const siteVisitService = {
  async validateAgent(code) {
    return api(`/site-visits/agents/validate?code=${encodeURIComponent(code)}`, { token: token() });
  },

  async submit(payload) {
    return api('/site-visits', { method: 'POST', token: token(), body: payload });
  },

  async getMine(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    const qs = q.toString();
    const data = await api(`/site-visits/mine${qs ? `?${qs}` : ''}`, { token: token() });
    return data?.items || data || [];
  },

  async getAdminList(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    const qs = q.toString();
    return api(`/site-visits/admin${qs ? `?${qs}` : ''}`, { token: token() });
  },

  async getAgentList(params = {}) {
    if (!token()) return [];
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    const qs = q.toString();
    const data = await api(`/site-visits/agent${qs ? `?${qs}` : ''}`, { token: token() });
    return data?.items || data || [];
  },

  async getEmployeeList(params = {}) {
    if (!token()) return [];
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    const qs = q.toString();
    const data = await api(`/site-visits/employee${qs ? `?${qs}` : ''}`, { token: token() });
    return data?.items || data || [];
  },

  async getById(id) {
    return api(`/site-visits/${id}`, { token: token() });
  },

  async approve(id, body = {}) {
    return api(`/site-visits/${id}/approve`, { method: 'POST', token: token(), body });
  },

  async reject(id, body = {}) {
    return api(`/site-visits/${id}/reject`, { method: 'POST', token: token(), body });
  },

  async assignAgent(id, agentId) {
    return api(`/site-visits/${id}/assign`, {
      method: 'POST',
      token: token(),
      body: { agentId },
    });
  },

  async assignEmployee(id, employeeId) {
    return api(`/site-visits/${id}/assign-employee`, {
      method: 'POST',
      token: token(),
      body: { employeeId },
    });
  },

  async updateEmployeeVisit(id, body = {}) {
    return api(`/site-visits/${id}/employee-workflow`, {
      method: 'PATCH',
      token: token(),
      body,
    });
  },

  async addInternalRemarks(id, remarks) {
    return api(`/site-visits/${id}/internal-remarks`, {
      method: 'POST',
      token: token(),
      body: { remarks },
    });
  },

  async markCompleted(id, body = {}) {
    return api(`/site-visits/${id}/complete`, { method: 'POST', token: token(), body });
  },

  async submitPurchaseInterest(id, body = {}) {
    return api(`/site-visits/${id}/purchase-interest`, { method: 'POST', token: token(), body });
  },

  async submitDrop(id, body = {}) {
    return api(`/site-visits/${id}/drop`, { method: 'POST', token: token(), body });
  },

  async close(id, body = {}) {
    return api(`/site-visits/${id}/close`, { method: 'POST', token: token(), body });
  },
};

/** Back-compat wrapper for existing visitService call sites. */
export const visitService = {
  getVisits: async () => siteVisitService.getMine({ pageSize: 100 }),
  getAllVisits: async (_viewer, scope) => {
    if (scope === 'mediator') return siteVisitService.getAgentList({ pageSize: 100 });
    const data = await siteVisitService.getAdminList({ pageSize: 100 });
    return data?.items || [];
  },
  getAssignedVisits: async (user) => {
    if (!token()) return [];
    if (user?.role === 'employee') {
      return siteVisitService.getEmployeeList({ pageSize: 100 });
    }
    return siteVisitService.getAgentList({ pageSize: 100 });
  },
  getForSeller: async () => [],
  getForBuyer: async () => siteVisitService.getMine({ pageSize: 100 }),
  getVisitById: (id) => siteVisitService.getById(id),
  schedule: async (payload) =>
    siteVisitService.submit({
      propertyId: payload.propertyId,
      visitDate: payload.visitDate || (payload.scheduledFor ? String(payload.scheduledFor).slice(0, 10) : undefined),
      visitTime: payload.visitTime || (payload.scheduledFor ? String(payload.scheduledFor).slice(11, 16) : undefined),
      remarks: payload.remarks,
      referralAgentCode: payload.referralAgentCode || payload.agentId,
    }),
  createVisit: async (payload) => visitService.schedule(payload),
  updateVisit: async () => null,
  confirmVisit: async (_user, id) => siteVisitService.updateEmployeeVisit(id, { employeeVisitStatus: 'confirmed' }),
  markCompleted: (_user, id) => siteVisitService.markCompleted(id, { note: 'Marked completed' }),
  markCancelled: async (_user, id) => siteVisitService.updateEmployeeVisit(id, { employeeVisitStatus: 'cancelled' }),
  markNoShow: async (_user, id) => siteVisitService.updateEmployeeVisit(id, { employeeVisitStatus: 'no_show' }),
  recordOutcome: async (_user, id, outcome) => siteVisitService.updateEmployeeVisit(id, { outcome }),
  addVisitNote: async (_user, id, note) => siteVisitService.updateEmployeeVisit(id, { note, appendNote: true }),
  assignRecord: async (id, meta) => {
    if (meta.assignedEmployeeId || meta.employeeId) {
      return siteVisitService.assignEmployee(id, meta.assignedEmployeeId || meta.employeeId);
    }
    return siteVisitService.assignAgent(id, meta.assignedMediatorId || meta.assignedAgentId || meta.agentId);
  },
};
