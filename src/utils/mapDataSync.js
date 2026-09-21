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

export function onMapDataUpdated(handler) {
  const onCustom = () => handler();
  const onStorage = (event) => {
    if (event.key === MAP_DATA_VERSION_KEY) handler();
  };
  window.addEventListener('merit-map-data-updated', onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('merit-map-data-updated', onCustom);
    window.removeEventListener('storage', onStorage);
  };
}
