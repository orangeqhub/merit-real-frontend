import { STORAGE_KEYS } from './storage';

/**
 * Persist Schedule Site Visit resume path across login / registration / approval.
 */
export function savePendingSiteVisit(path) {
  if (!path || typeof path !== 'string') return;
  if (!path.startsWith('/schedule-visit/')) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEYS.PENDING_SITE_VISIT, path);
  } catch {
    // ignore
  }
}

export function peekPendingSiteVisit() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEYS.PENDING_SITE_VISIT) || null;
  } catch {
    return null;
  }
}

export function consumePendingSiteVisit() {
  const path = peekPendingSiteVisit();
  try {
    window.sessionStorage.removeItem(STORAGE_KEYS.PENDING_SITE_VISIT);
  } catch {
    // ignore
  }
  return path;
}

export function clearPendingSiteVisit() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEYS.PENDING_SITE_VISIT);
  } catch {
    // ignore
  }
}
