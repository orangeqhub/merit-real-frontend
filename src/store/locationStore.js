import { create } from 'zustand';
import { readJSON, writeJSON, removeKey, STORAGE_KEYS } from '../utils/storage';

const MAX_RECENT = 5;

export const useLocationStore = create((set, get) => ({
  selectedLocation: readJSON(STORAGE_KEYS.SELECTED_LOCATION, ''),
  recentLocations: readJSON(STORAGE_KEYS.RECENT_LOCATIONS, []),

  selectLocation: (city) => {
    writeJSON(STORAGE_KEYS.SELECTED_LOCATION, city);
    const recent = [city, ...get().recentLocations.filter((c) => c !== city)].slice(0, MAX_RECENT);
    writeJSON(STORAGE_KEYS.RECENT_LOCATIONS, recent);
    set({ selectedLocation: city, recentLocations: recent });
  },

  clearLocation: () => {
    removeKey(STORAGE_KEYS.SELECTED_LOCATION);
    set({ selectedLocation: '' });
  },
}));
