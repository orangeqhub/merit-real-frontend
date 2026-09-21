import { api } from '../api/client';
import { saveSession, clearSession, getAccessToken, getCachedUser } from '../api/session';
import { mapApiUserToUi } from '../utils/userMapper';

const PUBLIC_ROLES = ['customer', 'agent', 'sales_member', 'employee'];

async function requestOtp(_mobile) {
  return Promise.reject(new Error('auth.error.otpNotAvailable'));
}

async function loginPublicWithPassword(identifier, password) {
  if (!identifier || !password) {
    throw new Error('auth.error.invalidCredentials');
  }

  const trimmedId = String(identifier).trim();

  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { identifier: trimmedId, password },
    });
    const user = mapApiUserToUi(data.user);
    if (!PUBLIC_ROLES.includes(user.role) && user.role !== 'admin') {
      throw new Error('ROLE_NOT_ALLOWED');
    }
    if (user.status === 'approved') {
      saveSession({ token: data.token, user }, true);
    }
    return user;
  } catch (err) {
    if (err.code === 'ACCOUNT_PENDING') {
      const mobileFromErrors = err.errors?.[0]?.mobile;
      const emailFromErrors = err.errors?.[0]?.email;
      return {
        status: 'pending',
        mobile: mobileFromErrors || (/^\d{10}$/.test(trimmedId) ? trimmedId : undefined),
        email: emailFromErrors || (trimmedId.includes('@') ? trimmedId : undefined),
        role: 'employee',
      };
    }

    if (err.status === 503 || err.code === 'DB_UNAVAILABLE') {
      throw new Error(err.message || 'Backend is unavailable. Please try again in a moment.');
    }

    const code = err.code || err.message;
    if (code === 'INVALID_CREDENTIALS' || code === 'auth.error.invalidCredentials') {
      throw new Error('auth.error.invalidCredentials');
    }
    if (code === 'REQUEST_ERROR' || code === 'NETWORK_ERROR') {
      throw new Error(err.message || 'Unable to reach the server. Is merit-api running?');
    }
    throw new Error(code || 'auth.error.invalidCredentials');
  }
}

async function loginPublicWithOtp(_mobile, _otp) {
  return Promise.reject(new Error('auth.error.otpNotAvailable'));
}

async function loginAdmin(loginId, password, remember = true) {
  try {
    const data = await api('/auth/admin/login', {
      method: 'POST',
      body: { identifier: String(loginId).trim(), password },
    });
    const user = mapApiUserToUi(data.user);
    saveSession({ token: data.token, user }, remember);
    return user;
  } catch (err) {
    if (err.code === 'ACCOUNT_INACTIVE' || err.code === 'ACCOUNT_PENDING' || err.code === 'ACCOUNT_LOCKED') {
      throw new Error('ACCOUNT_INACTIVE');
    }
    throw new Error('INVALID_CREDENTIALS');
  }
}

async function getSession() {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const profile = await api('/auth/me', { token, silent: true });
    const user = mapApiUserToUi(profile);
    saveSession({ token, user }, true);
    return user;
  } catch (err) {
    if (err?.status === 0 || err?.code === 'NETWORK_ERROR') {
      return getCachedUser() || null;
    }
    clearSession();
    return null;
  }
}

async function logout() {
  const token = getAccessToken();
  try {
    if (token) {
      await api('/auth/logout', { method: 'POST', token, silent: true });
    }
  } catch {
    // ignore
  }
  clearSession();
  return true;
}

export const authService = {
  requestOtp,
  loginPublicWithPassword,
  loginPublicWithOtp,
  loginAdmin,
  getSession,
  logout,
};
