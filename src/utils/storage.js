const PREFIX = 'omkr_';

export function readJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function isQuotaExceededError(err) {
  return (
    err instanceof DOMException &&
    (err.code === 22 || err.code === 1014 || err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}

export function writeJSON(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch (err) {
    if (import.meta.env?.DEV) {
      console.warn(`Failed to persist "${key}" to localStorage`, err);
    }
    return false;
  }
}

export function removeKey(key) {
  window.localStorage.removeItem(PREFIX + key);
  window.sessionStorage.removeItem(PREFIX + key);
}

export function writeSessionValue(key, value, remember) {
  try {
    const store = remember ? window.localStorage : window.sessionStorage;
    const other = remember ? window.sessionStorage : window.localStorage;
    store.setItem(PREFIX + key, JSON.stringify(value));
    other.removeItem(PREFIX + key);
    return true;
  } catch (err) {
    if (import.meta.env?.DEV) {
      console.warn(`Failed to persist session "${key}"`, err);
    }
    return false;
  }
}

export function readSessionValue(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key) ?? window.sessionStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** Client-only prefs — domain data comes from merit-api, not localStorage. */
export const STORAGE_KEYS = {
  SESSION: 'session',
  LANGUAGE: 'language',
  WIZARD_DRAFT: 'wizard_draft',
  COMPARE: 'compare_properties',
  SELECTED_LOCATION: 'selected_location',
  RECENT_LOCATIONS: 'recent_locations',
  WISHLIST: 'wishlist',
  GEO_PERMISSION: 'geo_permission',
  SAVED_SEARCHES: 'saved_searches',
  /** Admin media slot config until a dedicated API exists */
  MEDIA_RULES: 'media_rules_v2',
  /** Resume Express Interest after login / registration approval */
  PENDING_EXPRESS_INTEREST: 'pending_express_interest',
  /** Resume Schedule Site Visit after login / registration approval */
  PENDING_SITE_VISIT: 'pending_site_visit',
};
