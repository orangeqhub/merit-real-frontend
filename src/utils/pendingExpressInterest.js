import { STORAGE_KEYS } from './storage';

/**
 * Persist Express Interest resume path across login / registration / approval.
 * Uses sessionStorage so it clears when the browser tab closes.
 */
export function savePendingExpressInterest(path) {
  if (!path || typeof path !== 'string') return;
  if (!path.startsWith('/express-interest/')) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEYS.PENDING_EXPRESS_INTEREST, path);
  } catch {
    // ignore quota / private mode
  }
}

export function peekPendingExpressInterest() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEYS.PENDING_EXPRESS_INTEREST) || null;
  } catch {
    return null;
  }
}

export function consumePendingExpressInterest() {
  const path = peekPendingExpressInterest();
  try {
    window.sessionStorage.removeItem(STORAGE_KEYS.PENDING_EXPRESS_INTEREST);
  } catch {
    // ignore
  }
  return path;
}

export function clearPendingExpressInterest() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEYS.PENDING_EXPRESS_INTEREST);
  } catch {
    // ignore
  }
}
