/**
 * Persist map-plot booking resume path across login / registration / approval.
 * Uses sessionStorage so it clears when the browser tab closes.
 */
import { STORAGE_KEYS } from './storage';

export function savePendingBookPlot(path) {
  if (!path || typeof path !== 'string') return;
  if (!path.startsWith('/book-plot/')) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEYS.PENDING_BOOK_PLOT, path);
  } catch {
    // ignore quota / private mode
  }
}

export function peekPendingBookPlot() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEYS.PENDING_BOOK_PLOT) || null;
  } catch {
    return null;
  }
}

export function consumePendingBookPlot() {
  const path = peekPendingBookPlot();
  try {
    window.sessionStorage.removeItem(STORAGE_KEYS.PENDING_BOOK_PLOT);
  } catch {
    // ignore
  }
  return path;
}

export function clearPendingBookPlot() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEYS.PENDING_BOOK_PLOT);
  } catch {
    // ignore
  }
}
