import { api } from '../api/client';
import { getAccessToken } from '../api/session';

function token() {
  return getAccessToken();
}

export const expressInterestService = {
  async validateAgent(code) {
    return api(`/express-interests/agents/validate?code=${encodeURIComponent(code)}`, { token: token() });
  },

  async searchAgentsByName(query, { limit = 15 } = {}) {
    const q = new URLSearchParams();
    if (query) q.set('q', String(query).trim());
    if (limit) q.set('limit', String(limit));
    const qs = q.toString();
    const data = await api(`/express-interests/agents/search${qs ? `?${qs}` : ''}`, { token: token() });
    return Array.isArray(data) ? data : [];
  },

  async submit(payload) {
    return api('/express-interests', { method: 'POST', token: token(), body: payload });
  },

  async getMine(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    const qs = q.toString();
    const data = await api(`/express-interests/mine${qs ? `?${qs}` : ''}`, { token: token() });
    return data?.items || data || [];
  },

  async getAdminList(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    const qs = q.toString();
    return api(`/express-interests/admin${qs ? `?${qs}` : ''}`, { token: token() });
  },

  async getAgentLeads(params = {}) {
    if (!token()) return [];
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    const qs = q.toString();
    const data = await api(`/express-interests/agent${qs ? `?${qs}` : ''}`, { token: token() });
    return data?.items || data || [];
  },

  async getEmployeeLeads(params = {}) {
    if (!token()) return [];
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    const qs = q.toString();
    const data = await api(`/express-interests/employee${qs ? `?${qs}` : ''}`, { token: token() });
    return data?.items || data || [];
  },

  async getById(id) {
    return api(`/express-interests/${id}`, { token: token() });
  },

  async approve(id, body = {}) {
    return api(`/express-interests/${id}/approve`, { method: 'POST', token: token(), body });
  },

  async reject(id, body = {}) {
    return api(`/express-interests/${id}/reject`, { method: 'POST', token: token(), body });
  },

  async assignAgent(id, agentId) {
    return api(`/express-interests/${id}/assign`, {
      method: 'POST',
      token: token(),
      body: { agentId },
    });
  },

  async assignEmployee(id, employeeId) {
    return api(`/express-interests/${id}/assign-employee`, {
      method: 'POST',
      token: token(),
      body: { employeeId },
    });
  },

  async updateEmployeeWorkflow(id, body = {}) {
    return api(`/express-interests/${id}/employee-workflow`, {
      method: 'PATCH',
      token: token(),
      body,
    });
  },

  async addInternalRemarks(id, remarks) {
    return api(`/express-interests/${id}/internal-remarks`, {
      method: 'POST',
      token: token(),
      body: { remarks },
    });
  },

  async addFollowUp(id, body) {
    return api(`/express-interests/${id}/follow-ups`, { method: 'POST', token: token(), body });
  },

  async close(id, body = {}) {
    return api(`/express-interests/${id}/close`, { method: 'POST', token: token(), body });
  },

  async submitPurchase(id, body = {}) {
    return api(`/express-interests/${id}/purchase`, { method: 'POST', token: token(), body });
  },

  async submitBooking(id, body = {}) {
    return api(`/express-interests/${id}/booking`, { method: 'POST', token: token(), body });
  },

  async getPurchasesMine(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    const qs = q.toString();
    const data = await api(`/express-interests/purchases/mine${qs ? `?${qs}` : ''}`, { token: token() });
    return data?.items || data || [];
  },

  async getPurchasesAdmin(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    const qs = q.toString();
    return api(`/express-interests/purchases/admin${qs ? `?${qs}` : ''}`, { token: token() });
  },

  async getPurchasesAgent(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    const qs = q.toString();
    const data = await api(`/express-interests/purchases/agent${qs ? `?${qs}` : ''}`, { token: token() });
    return data?.items || data || [];
  },

  async getPurchaseById(id) {
    return api(`/express-interests/purchases/${id}`, { token: token() });
  },

  async updatePurchaseStatus(id, body) {
    return api(`/express-interests/purchases/${id}/status`, { method: 'POST', token: token(), body });
  },

  async addPurchaseRemarks(id, remarks) {
    return api(`/express-interests/purchases/${id}/remarks`, {
      method: 'POST',
      token: token(),
      body: { remarks },
    });
  },

  async getBookingsMine(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    const qs = q.toString();
    const data = await api(`/express-interests/bookings/mine${qs ? `?${qs}` : ''}`, { token: token() });
    return data?.items || data || [];
  },

  async getBookingsAdmin(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    const qs = q.toString();
    try {
      return await api(`/express-interests/bookings/admin${qs ? `?${qs}` : ''}`, {
        token: token(),
        silent: true,
      });
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        return { items: [], total: 0, page: 1, pageSize: 100, totalPages: 1 };
      }
      throw err;
    }
  },

  async getBookingsAgent(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    const qs = q.toString();
    const data = await api(`/express-interests/bookings/agent${qs ? `?${qs}` : ''}`, { token: token() });
    return data?.items || data || [];
  },

  async getBookingById(id) {
    return api(`/express-interests/bookings/${id}`, { token: token() });
  },

  async updateBookingStatus(id, body) {
    return api(`/express-interests/bookings/${id}/status`, { method: 'POST', token: token(), body });
  },

  async addBookingRemarks(id, remarks) {
    return api(`/express-interests/bookings/${id}/remarks`, {
      method: 'POST',
      token: token(),
      body: { remarks },
    });
  },

  async recordBookingPayment(id, { amount, paymentDate, remarks }, proofFile) {
    const formData = new FormData();
    formData.append('amount', String(amount));
    if (paymentDate) formData.append('paymentDate', paymentDate);
    if (remarks) formData.append('remarks', remarks);
    if (proofFile) formData.append('proof', proofFile);
    return api(`/express-interests/bookings/${id}/payments`, {
      method: 'POST',
      token: token(),
      formData,
    });
  },

  async addBookingFollowUp(id, body) {
    return api(`/express-interests/bookings/${id}/follow-ups`, {
      method: 'POST',
      token: token(),
      body,
    });
  },

  async convertBookingToPurchase(id, body = {}) {
    return api(`/express-interests/bookings/${id}/convert-purchase`, {
      method: 'POST',
      token: token(),
      body,
    });
  },

  async cancelBooking(id, body = {}) {
    return api(`/express-interests/bookings/${id}/cancel`, {
      method: 'POST',
      token: token(),
      body,
    });
  },

  async extendBooking(id, body = {}) {
    return api(`/express-interests/bookings/${id}/extend`, {
      method: 'POST',
      token: token(),
      body,
    });
  },

  async releaseBooking(id, body = {}) {
    return api(`/express-interests/bookings/${id}/release`, {
      method: 'POST',
      token: token(),
      body,
    });
  },

  async keepBookingUnderReview(id, body = {}) {
    return api(`/express-interests/bookings/${id}/under-review`, {
      method: 'POST',
      token: token(),
      body,
    });
  },

  async getBookingsRequiringDecision(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api(`/express-interests/bookings/requiring-decision${qs ? `?${qs}` : ''}`, { token: token() });
  },

  async getBookingStats() {
    return api('/express-interests/bookings/stats/summary', { token: token() });
  },

  async completePurchase(id, body = {}) {
    return api(`/express-interests/purchases/${id}/complete`, {
      method: 'POST',
      token: token(),
      body,
    });
  },

  async recordPurchasePayment(id, { amount, paymentDate, remarks, paymentMethod, paymentReference }, proofFile) {
    const formData = new FormData();
    formData.append('amount', String(amount));
    if (paymentDate) formData.append('paymentDate', paymentDate);
    if (remarks) formData.append('remarks', remarks);
    if (paymentMethod) formData.append('paymentMethod', paymentMethod);
    if (paymentReference) formData.append('paymentReference', paymentReference);
    if (proofFile) formData.append('proof', proofFile);
    return api(`/express-interests/purchases/${id}/payments`, {
      method: 'POST',
      token: token(),
      formData,
    });
  },

  async getPurchaseReceipt(id, type = null) {
    const q = type ? `?type=${encodeURIComponent(type)}` : '';
    return api(`/express-interests/purchases/${id}/receipt${q}`, { token: token() });
  },

  async listPurchaseReceipts(id) {
    return api(`/express-interests/purchases/${id}/receipts`, { token: token() });
  },

  async getClosedDealsMine(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    const qs = q.toString();
    const data = await api(`/express-interests/closed-deals/mine${qs ? `?${qs}` : ''}`, { token: token() });
    return data?.items || data || [];
  },

  async getClosedDealsAdmin(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    const qs = q.toString();
    return api(`/express-interests/closed-deals/admin${qs ? `?${qs}` : ''}`, { token: token() });
  },

  async getAgentDealStats() {
    return api('/express-interests/closed-deals/stats', { token: token() });
  },

  async getSalesReports() {
    return api('/express-interests/reports/sales', { token: token() });
  },

  async listDocuments(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    const qs = q.toString();
    return api(`/express-interests/documents${qs ? `?${qs}` : ''}`, { token: token() });
  },

  async getPaymentReceipt(id, action = 'VIEW') {
    const q = action && action !== 'VIEW' ? `?action=${encodeURIComponent(action)}` : '';
    return api(`/express-interests/documents/payment-receipts/${id}${q}`, { token: token() });
  },

  async getSaleCertificate(id, action = 'VIEW') {
    const q = action && action !== 'VIEW' ? `?action=${encodeURIComponent(action)}` : '';
    return api(`/express-interests/documents/sale-certificates/${id}${q}`, { token: token() });
  },

  async getSaleCertificateByPurchase(purchaseId) {
    return api(`/express-interests/purchases/${purchaseId}/sale-certificate`, { token: token() });
  },
};

/** Back-compat wrapper so existing enquiry UI can load express interests. */
export const enquiryService = {
  getEnquiries: async () => expressInterestService.getMine(),
  getAllEnquiries: async (_viewer, scope) => {
    if (scope === 'mediator') {
      const data = await expressInterestService.getAgentLeads({ pageSize: 100 });
      return (data?.items || data || []).map(mapEnquiryCompat);
    }
    const data = await expressInterestService.getAdminList({ pageSize: 100 });
    return (data?.items || []).map(mapEnquiryCompat);
  },
  getAssignedEnquiries: async (user) => {
    if (user?.role === 'employee') {
      const data = await expressInterestService.getEmployeeLeads({ pageSize: 100 });
      return (Array.isArray(data) ? data : []).map(mapEnquiryCompat);
    }
    const data = await expressInterestService.getAgentLeads({ pageSize: 100 });
    return (data?.items || data || []).map(mapEnquiryCompat);
  },
  getForSeller: async () => [],
  getForBuyer: async () => {
    const list = await expressInterestService.getMine({ pageSize: 100 });
    return (Array.isArray(list) ? list : []).map(mapEnquiryCompat);
  },
  getById: async (userOrId, maybeId) => {
    const id = maybeId != null ? maybeId : userOrId;
    return mapEnquiryCompat(await expressInterestService.getById(id));
  },
  getEnquiryById: (id) => enquiryService.getById(id),
  create: async (payload) => {
    if (!payload?.propertyId) {
      throw new Error('General contact enquiries are not available yet. Please express interest from a property page.');
    }
    return expressInterestService.submit({
      propertyId: payload.propertyId,
      remarks: payload.message || payload.remarks,
      referralAgentCode: payload.referralAgentCode || payload.agentId,
      agentName: payload.agentName,
    });
  },
  createEnquiry: async (payload) => enquiryService.create(payload),
  updateStatus: async (user, id, status) => enquiryService.updateContactStatus(user, id, status),
  updateContactStatus: async (_user, id, status) => {
    return mapEnquiryCompat(await expressInterestService.updateEmployeeWorkflow(id, { status }));
  },
  setPriority: async (_user, id, priority) => {
    return mapEnquiryCompat(await expressInterestService.updateEmployeeWorkflow(id, { priority }));
  },
  setNextFollowUp: async (_user, id, nextFollowUpAt) => {
    return mapEnquiryCompat(await expressInterestService.updateEmployeeWorkflow(id, {
      nextFollowUpAt,
      status: nextFollowUpAt ? 'followup_required' : undefined,
    }));
  },
  markComplete: async (_user, id) => {
    return mapEnquiryCompat(await expressInterestService.updateEmployeeWorkflow(id, { status: 'converted' }));
  },
  updateEnquiry: async () => null,
  assignRecord: async (id, meta) => {
    if (meta.assignedEmployeeId || meta.employeeId) {
      return expressInterestService.assignEmployee(id, meta.assignedEmployeeId || meta.employeeId);
    }
    return expressInterestService.assignAgent(
      id,
      meta.assignedAgentId || meta.assignedMediatorId || meta.agentId
    );
  },
};

function mapEnquiryCompat(row) {
  if (!row) return null;
  const workflowStatus = row.employeeWorkflowStatus || null;
  return {
    ...row,
    // Employee screens use workflow status; pipeline status stays on statusRaw
    status: workflowStatus || row.status,
    buyerName: row.buyerName || row.customer?.name || null,
    buyerPhone: row.buyerPhone || row.customer?.mobile || null,
    message: row.message || row.remarks || '',
    assignedMediatorId: row.assignedAgentId || row.assignedMediatorId || null,
    assignedEmployeeId: row.assignedEmployeeId || null,
    priority: row.priority || 'medium',
    nextFollowUpAt: row.nextFollowUpAt || null,
    propertyTitle: row.propertyName || row.property?.titleEn || row.propertyTitle || null,
  };
}
