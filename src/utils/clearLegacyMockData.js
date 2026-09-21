/**
 * One-time cleanup of legacy localStorage mock entity data (omkr_* seeds).
 * Keeps client prefs: language, location, wishlist, compare, drafts.
 */
const PREFIX = 'omkr_';

const REMOVE_KEYS = [
  'users',
  'properties',
  'notifications',
  'enquiries',
  'visits',
  'call_notes',
  'follow_ups',
  'internal_notes',
  'cms',
  'media_rules',
  'audit_log',
  'favourites',
  'recently_viewed',
  'seeded_v2',
  'categories_v1',
  'settings',
];

const FLAG = 'mock_data_cleared_v1';

export function clearLegacyMockData() {
  try {
    if (window.localStorage.getItem(PREFIX + FLAG) === '1') return;

    for (const key of REMOVE_KEYS) {
      window.localStorage.removeItem(PREFIX + key);
      window.sessionStorage.removeItem(PREFIX + key);
    }

    // Also drop any leftover session that pointed at seeded user ids
    // (new auth uses token-based session written by api/session.js).
    const sessionRaw = window.localStorage.getItem(PREFIX + 'session')
      || window.sessionStorage.getItem(PREFIX + 'session');
    if (sessionRaw) {
      try {
        const session = JSON.parse(sessionRaw);
        if (session && !session.token) {
          window.localStorage.removeItem(PREFIX + 'session');
          window.sessionStorage.removeItem(PREFIX + 'session');
        }
      } catch {
        window.localStorage.removeItem(PREFIX + 'session');
        window.sessionStorage.removeItem(PREFIX + 'session');
      }
    }

    window.localStorage.setItem(PREFIX + FLAG, '1');
  } catch {
    // ignore
  }
}
