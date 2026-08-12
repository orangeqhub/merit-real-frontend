import { create } from 'zustand';
import { CITIES } from '../data/locations';
import { reverseGeocode } from '../utils/geo';
import { readSessionValue, writeSessionValue, removeKey, STORAGE_KEYS } from '../utils/storage';
import { useLocationStore } from './locationStore';

function matchCity(place) {
  if (!place?.city) return '';
  const rawCity = String(place.city).trim();
  const fromList = CITIES.find((c) => c.toLowerCase() === rawCity.toLowerCase());
  if (fromList) return fromList;
  const fromLabel = CITIES.find((c) => String(place.label || '').toLowerCase().includes(c.toLowerCase()));
  return fromLabel || rawCity;
}

function persistLocation(payload) {
  if (!payload) {
    removeKey(STORAGE_KEYS.USER_LOCATION);
    return;
  }
  writeSessionValue(STORAGE_KEYS.USER_LOCATION, payload, false);
}

const saved = readSessionValue(STORAGE_KEYS.USER_LOCATION, null);
if (saved?.label && !useLocationStore.getState().selectedLocation) {
  useLocationStore.getState().selectLocation(saved.label);
}

/**
 * Live GPS-derived location for nearby property sorting and header display.
 * Only ever calls navigator.geolocation in direct response to user action
 * (Select Location / Use my current location / Try again).
 */
export const useUserLocationStore = create((set, get) => ({
  coords: saved?.coords || null,
  label: saved?.label || '',
  place: saved?.place || null,
  status: saved?.coords ? 'granted' : 'idle',
  error: null,

  requestLocation: () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      set({ status: 'unavailable', error: 'unsupported' });
      return;
    }

    set({ status: 'loading', error: null });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coords = { lat: latitude, lng: longitude };
        set({ coords, status: 'granted', error: null });

        try {
          const place = await reverseGeocode(latitude, longitude);
          const city = matchCity(place);
          const label = city || place.label || '';
          const nextPlace = {
            city: city || place.city || '',
            district: place.district || '',
            state: place.state || '',
            label: place.label || label,
          };

          if (city) {
            useLocationStore.getState().selectLocation(city);
          }

          const payload = { coords, label, place: nextPlace };
          persistLocation(payload);
          set({ label, place: nextPlace });
        } catch {
          persistLocation({ coords, label: get().label || '', place: get().place });
        }
      },
      (err) => {
        if (err?.code === 1) {
          set({ status: 'denied', error: 'denied' });
          return;
        }
        if (err?.code === 3) {
          set({ status: 'unavailable', error: 'timeout' });
          return;
        }
        set({ status: 'unavailable', error: 'unavailable' });
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false }
    );
  },

  clear: () => {
    persistLocation(null);
    set({ coords: null, label: '', place: null, status: 'idle', error: null });
  },
}));
