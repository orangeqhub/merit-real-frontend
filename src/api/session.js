import { readSessionValue, writeSessionValue, removeKey, STORAGE_KEYS } from '../utils/storage';

const TOKEN_KEY = 'access_token';

/** @deprecated Local employee tokens are no longer used. Kept for call-site compatibility. */
export function isLocalEmployeeToken() {
  return false;
}

export function getAccessToken() {
  const session = readSessionValue(STORAGE_KEYS.SESSION, null);
  return session?.token || null;
}

/** Alias for getAccessToken — all sessions now use real API JWTs. */
export function getApiAccessToken() {
  return getAccessToken();
}

export function getCachedUser() {
  const session = readSessionValue(STORAGE_KEYS.SESSION, null);
  return session?.user || null;
}

export function saveSession({ token, user }, remember = true) {
  writeSessionValue(STORAGE_KEYS.SESSION, { token, user }, remember);
  writeSessionValue(TOKEN_KEY, token, remember);
}

export function clearSession() {
  removeKey(STORAGE_KEYS.SESSION);
  removeKey(TOKEN_KEY);
}
