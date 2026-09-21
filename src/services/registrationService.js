import { api } from '../api/client';
import { getAccessToken } from '../api/session';
import { mapApiUserToUi, mapApplicationStatus } from '../utils/userMapper';

async function register(role, data) {
  try {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('mobile', data.mobile);
    formData.append('email', data.email);
    formData.append('password', data.password);
    formData.append('role', String(role).toLowerCase());
    if (data.district) formData.append('district', data.district);
    if (data.city) formData.append('city', data.city);
    if (data.address) formData.append('address', data.address);
    if (data.occupation) formData.append('occupation', String(data.occupation).trim());
    if (data.preferredPropertyType) formData.append('preferredPropertyType', data.preferredPropertyType);
    if (data.agentCategoryId) formData.append('agentCategoryId', String(data.agentCategoryId));
    if (data.profilePhoto instanceof File) formData.append('profilePhoto', data.profilePhoto);
    if (data.aadhaarNumber) formData.append('aadhaarNumber', data.aadhaarNumber);
    if (data.panNumber) formData.append('panNumber', String(data.panNumber).toUpperCase());
    if (data.aadhaarProof instanceof File) formData.append('aadhaarProof', data.aadhaarProof);
    if (data.panProof instanceof File) formData.append('panProof', data.panProof);
    if (data.referralAgentCode) formData.append('referralAgentCode', String(data.referralAgentCode).trim());
    if (data.referralAgentId) formData.append('referralAgentId', String(data.referralAgentId));

    const user = await api('/auth/register', {
      method: 'POST',
      formData,
    });

    return mapApiUserToUi(user);
  } catch (err) {
    if (err.code === 'DUPLICATE_USER') {
      throw new Error('auth.error.mobileAlreadyRegistered');
    }
    throw new Error(err.message || 'registration.error.failed');
  }
}

async function getApplicationStatus(mobile) {
  try {
    const status = await api(`/auth/application-status?mobile=${encodeURIComponent(mobile)}`);
    return mapApplicationStatus(status);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

async function listPending() {
  const list = await api('/registrations/pending', { token: getAccessToken() });
  return (Array.isArray(list) ? list : []).map(mapApiUserToUi);
}

async function listAll(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.role) query.set('role', params.role);
  const qs = query.toString();
  const list = await api(`/registrations${qs ? `?${qs}` : ''}`, { token: getAccessToken() });
  return (Array.isArray(list) ? list : []).map(mapApiUserToUi);
}

async function getById(id) {
  const user = await api(`/registrations/${id}`, { token: getAccessToken() });
  return mapApiUserToUi(user);
}

async function assignEmployee() {
  throw new Error('API not implemented yet');
}

async function approve(id, options = {}) {
  const body = {};
  if (options.grade) body.grade = options.grade;
  const user = await api(`/registrations/${id}/approve`, {
    method: 'POST',
    token: getAccessToken(),
    body,
  });
  return mapApiUserToUi(user);
}

async function reject(id, reason) {
  const user = await api(`/registrations/${id}/reject`, {
    method: 'POST',
    token: getAccessToken(),
    body: { reason },
  });
  return mapApiUserToUi(user);
}

async function listAgentCategories() {
  return api('/agent-categories');
}

export const registrationService = {
  register,
  getApplicationStatus,
  listPending,
  listAll,
  getById,
  approve,
  reject,
  assignEmployee,
  listAgentCategories,
};
