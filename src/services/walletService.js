import { api } from '../api/client';
import { getAccessToken } from '../api/session';

function token() {
  return getAccessToken();
}

export const walletService = {
  getConfig() {
    return api('/wallet/config', { token: token(), silent: true });
  },

  getMine() {
    return api('/wallet/mine', { token: token(), silent: true });
  },

  getTransactions(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api(`/wallet/mine/transactions${qs ? `?${qs}` : ''}`, { token: token(), silent: true });
  },

  getBankDetails() {
    return api('/wallet/mine/bank', { token: token() });
  },

  saveBankDetails(formData) {
    return api('/wallet/mine/bank', { method: 'PUT', formData, token: token() });
  },

  redeem(payload) {
    return api('/wallet/mine/redeem', { method: 'POST', body: payload, token: token() });
  },

  getMyRedemptions(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api(`/wallet/mine/redemptions${qs ? `?${qs}` : ''}`, { token: token() });
  },

  getAgentReports() {
    return api('/wallet/mine/reports', { token: token() });
  },

  getAdminReports() {
    return api('/wallet/reports/admin', { token: token() });
  },

  listRedemptions(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api(`/wallet/redemptions${qs ? `?${qs}` : ''}`, { token: token() });
  },

  getAgentBank(agentId) {
    return api(`/wallet/agents/${agentId}/bank`, { token: token() });
  },

  getAgentWallet(agentId) {
    return api(`/wallet/agents/${agentId}`, { token: token() });
  },

  creditCommission(closedDealId, body) {
    return api(`/wallet/credit-commission/${closedDealId}`, { method: 'POST', body, token: token() });
  },

  manualCredit(body) {
    return api('/wallet/manual-credit', { method: 'POST', body, token: token() });
  },

  approveRedemption(id, body = {}) {
    return api(`/wallet/redemptions/${id}/approve`, { method: 'POST', body, token: token() });
  },

  rejectRedemption(id, body = {}) {
    return api(`/wallet/redemptions/${id}/reject`, { method: 'POST', body, token: token() });
  },

  settleRedemption(id, body = {}) {
    return api(`/wallet/redemptions/${id}/settle`, { method: 'POST', body, token: token() });
  },
};
