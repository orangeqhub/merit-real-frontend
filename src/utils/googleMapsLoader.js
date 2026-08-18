/**
 * Singleton Google Maps JavaScript API loader.
 * Uses the modern async loading approach (loading=async + importLibrary).
 * Loads both the core Maps library and the Places library (new API).
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
 * Check if the new Places library is available.
 */
export function isPlacesAvailable() {
  return isGoogleMapsAvailable()
    && typeof window.google.maps.places !== 'undefined'
    && typeof window.google.maps.places.AutocompleteSuggestion !== 'undefined';
}

/**
 * Load the Google Maps JavaScript API with Places library.
 * Uses the modern loading=async approach and importLibrary for the Places library.
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;

    const timer = setTimeout(() => {
      console.warn('[googleMapsLoader] Google Maps script timed out.');
      loadPromise = null;
      resolve(null);
    }, LOAD_TIMEOUT_MS);

    script.onload = () => {
      clearTimeout(timer);
      if (!window.google?.maps) {
        loadPromise = null;
        resolve(null);
        return;
      }
      // Import core maps library first, then places library
      Promise.all([
        window.google.maps.importLibrary('maps'),
        window.google.maps.importLibrary('places'),
      ]).then(() => {
        mapsReady = true;
        resolve(window.google.maps);
      }).catch((err) => {
        console.warn('[googleMapsLoader] Failed to import Places library:', err);
        // Maps core loaded — still useful for Geocoder, Map, Marker
        mapsReady = true;
        resolve(window.google.maps);
      });
    };

    script.onerror = () => {
      clearTimeout(timer);
      console.warn('[googleMapsLoader] Failed to load Google Maps script.');
      loadPromise = null;
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
