import { create } from 'zustand';
import { CITIES } from '../data/locations';
import { reverseGeocode } from '../utils/geo';

/**
 * Live GPS-derived location, used for "nearby first" property sorting and
 * per-card distance badges. Deliberately separate from
 * src/store/locationStore.js (the manually-picked "selected city" used by
 * search filters) — this store only ever gets coordinates from
 * navigator.geolocation, and only in direct response to the user selecting
 * "Use My Current Location" in the Hero search, never automatically.
 */
export const useUserLocationStore = create((set) => ({
  coords: null, // { lat, lng } | null
  label: '', // human-readable detected place, once resolved
  status: 'idle', // 'idle' | 'loading' | 'granted' | 'denied'

  requestLocation: () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      set({ status: 'denied' });
      return;
    }
    set({ status: 'loading' });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        set({ coords: { lat: latitude, lng: longitude }, status: 'granted' });
        try {
          const place = await reverseGeocode(latitude, longitude);
          const matchedCity = CITIES.find((c) => c.toLowerCase() === place.city.toLowerCase());
          set({ label: matchedCity || place.label || '' });
        } catch {
          // Reverse geocoding failed (offline, rate-limited, etc.) — the
          // coordinates are still set, so nearby sorting/distance badges
          // keep working, just without a friendly place name.
        }
      },
      () => {
        set({ status: 'denied' });
      },
      { timeout: 10000 }
    );
  },

  clear: () => set({ coords: null, label: '', status: 'idle' }),
}));
