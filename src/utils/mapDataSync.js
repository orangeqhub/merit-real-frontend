/** Bumps a version so public map layout + iframe refresh sheet/API data. */
export const MAP_DATA_VERSION_KEY = 'merit_map_data_version';

export function notifyMapDataUpdated() {
  const version = String(Date.now());
  try {
    localStorage.setItem(MAP_DATA_VERSION_KEY, version);
  } catch {
    // ignore quota / private mode
  }
  try {
    window.dispatchEvent(
      new CustomEvent('merit-map-data-updated', { detail: { version } })
    );
  } catch {
    // ignore
  }
  return version;
}

/** Refetch at most this often on focus/visibility, and poll this often while visible. */
const FOCUS_THROTTLE_MS = 2000;
const POLL_MS = 60000;

/**
 * The ONE refresh trigger shared by the Plot Board and every native map, so
 * they always reload together and can never show different data:
 *  - an Excel import in this tab or another tab of the same site,
 *  - this tab regaining focus / becoming visible (covers imports done from a
 *    different address, e.g. 127.0.0.1 vs localhost, or another device),
 *  - a background poll while the tab is visible.
 */
export function onMapDataUpdated(handler) {
  let last = 0;
  const run = () => {
    last = Date.now();
    handler();
  };
  const onCustom = () => run();
  const onStorage = (event) => {
    if (event.key === MAP_DATA_VERSION_KEY) run();
  };
  const onMessage = (event) => {
    if (event?.data?.type === 'merit-map-data-updated') run();
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible' && Date.now() - last > FOCUS_THROTTLE_MS) run();
  };
  const timer = window.setInterval(() => {
    if (document.visibilityState === 'visible') run();
  }, POLL_MS);
  window.addEventListener('merit-map-data-updated', onCustom);
  window.addEventListener('storage', onStorage);
  window.addEventListener('message', onMessage);
  window.addEventListener('focus', onVisible);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener('merit-map-data-updated', onCustom);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('message', onMessage);
    window.removeEventListener('focus', onVisible);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
