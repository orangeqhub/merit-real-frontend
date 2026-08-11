import { create } from 'zustand';
import { propertyService } from '../services/propertyService';

export const useFavouritesStore = create((set, get) => ({
  ids: [],

  refresh: async (userId) => {
    if (!userId) return set({ ids: [] });
    const ids = await propertyService.getFavouriteIds(userId);
    set({ ids: Array.isArray(ids) ? ids : [] });
  },

  toggle: async (userId, propertyId) => {
    if (!userId) return;
    const next = await propertyService.toggleFavourite(userId, propertyId);
    set({ ids: Array.isArray(next) ? next : next?.ids || [] });
  },

  isFavourite: (propertyId) => get().ids.includes(propertyId),
}));
