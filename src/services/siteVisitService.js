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

  async submitFromInterest(interestId, payload) {
    try {
      return await api(`/site-visits/from-interest/${interestId}`, {
        method: 'POST',
        token: token(),
        body: payload,
        silent: true,
      });
    } catch (err) {
      // Keep compatibility with deployments that accept the relationship on
      // the standard create endpoint instead of exposing a transition route.
      if (err?.status !== 404 && err?.status !== 405) throw err;
      return api('/site-visits', {
        method: 'POST',
        token: token(),
        body: { ...payload, expressInterestId: interestId },
      });
    }
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

  async addRemarks(id, remarks) {
    return api(`/site-visits/${id}/remarks`, {
      method: 'POST',
      token: token(),
      body: { remarks },
    });
  },

  async remarks(id, body) {
    return api(`/site-visits/${id}/remarks`, { method: 'POST', token: token(), body });
  },

  async addFollowUp(id, body) {
    return api(`/site-visits/${id}/follow-ups`, {
      method: 'POST',
      token: token(),
      body,
    });
  },

  async followUps(id, body) {
    return api(`/site-visits/${id}/follow-ups`, { method: 'POST', token: token(), body });
  },

  async markCompleted(id, body = {}) {
    return siteVisitService.complete(id, body);
  },

  async confirm(id, body = {}) {
    return api(`/site-visits/${id}/confirm`, { method: 'POST', token: token(), body });
  },

  async approveVehicle(id, body = {}) {
    return api(`/site-visits/${id}/approve-vehicle`, { method: 'POST', token: token(), body });
  },

  async assignVehicle(id, body) {
    return api(`/site-visits/${id}/assign-vehicle`, { method: 'POST', token: token(), body });
  },

  async rejectVehicle(id, body) {
    return api(`/site-visits/${id}/reject-vehicle`, { method: 'POST', token: token(), body });
  },

  async acceptVehicle(id, body = {}) {
    return api(`/site-visits/${id}/accept-vehicle`, { method: 'POST', token: token(), body });
  },

  async requestVehicleChange(id, body) {
    return api(`/site-visits/${id}/request-vehicle-change`, { method: 'POST', token: token(), body });
  },

  async requestReschedule(id, body) {
    return api(`/site-visits/${id}/request-reschedule`, { method: 'POST', token: token(), body });
  },

  async reschedule(id, body) {
    return api(`/site-visits/${id}/reschedule`, { method: 'POST', token: token(), body });
  },

  async cancel(id, body = {}) {
    return api(`/site-visits/${id}/cancel`, { method: 'POST', token: token(), body });
  },

  async start(id, body = {}) {
    return api(`/site-visits/${id}/start`, { method: 'POST', token: token(), body });
  },

  async complete(id, body = {}) {
    return api(`/site-visits/${id}/complete`, { method: 'POST', token: token(), body });
  },

  async markNoShow(id, body = {}) {
    return api(`/site-visits/${id}/no-show`, { method: 'POST', token: token(), body });
  },

  async noShow(id, body = {}) {
    return siteVisitService.markNoShow(id, body);
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
  confirmVisit: async (_user, id) => siteVisitService.confirm(id),
  markCompleted: (_user, id) => siteVisitService.complete(id, { note: 'Marked completed' }),
  markCancelled: async (_user, id) => siteVisitService.cancel(id),
  markNoShow: async (_user, id) => siteVisitService.markNoShow(id),
  recordOutcome: async (_user, id, outcome) => siteVisitService.updateEmployeeVisit(id, { outcome }),
  addVisitNote: async (_user, id, note) => siteVisitService.updateEmployeeVisit(id, { note, appendNote: true }),
  assignRecord: async (id, meta) => {
    if (meta.assignedEmployeeId || meta.employeeId) {
      return siteVisitService.assignEmployee(id, meta.assignedEmployeeId || meta.employeeId);
    }
    return siteVisitService.assignAgent(id, meta.assignedMediatorId || meta.assignedAgentId || meta.agentId);
  },
};
