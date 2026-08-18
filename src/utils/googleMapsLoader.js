/**
 * Singleton Google Maps JavaScript API loader.
 * Loads the Maps JS API with the Places library via dynamic script injection.
 * Returns a promise that resolves when the API is ready.
 * Fails gracefully — never throws if the env var is missing or loading fails.
 */

const LOAD_TIMEOUT_MS = 15000;

let loadPromise = null;
let mapsReady = false;

function getApiKey() {
  try {
    return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  } catch {
    return '';
  }
}

export function isGoogleMapsAvailable() {
  return mapsReady && typeof window.google !== 'undefined' && typeof window.google.maps !== 'undefined';
}

/**
 * Load the Google Maps JavaScript API with Places library.
 * Returns the google.maps namespace when ready, or null on failure.
 */
export function loadGoogleMaps() {
  if (mapsReady && window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }
  if (loadPromise) return loadPromise;

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[googleMapsLoader] VITE_GOOGLE_MAPS_API_KEY is not set. Google Maps disabled.');
    return Promise.resolve(null);
  }

  loadPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;

    const timer = setTimeout(() => {
      console.warn('[googleMapsLoader] Google Maps script timed out.');
      resolve(null);
    }, LOAD_TIMEOUT_MS);

    script.onload = () => {
      clearTimeout(timer);
      if (window.google?.maps) {
        mapsReady = true;
        resolve(window.google.maps);
      } else {
        resolve(null);
      }
    };

    script.onerror = () => {
      clearTimeout(timer);
      console.warn('[googleMapsLoader] Failed to load Google Maps script.');
      resolve(null);
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Create a Google Maps InfoWindow instance.
 */
export function createInfoWindow(options = {}) {
  if (!isGoogleMapsAvailable()) return null;
  return new window.google.maps.InfoWindow(options);
}
