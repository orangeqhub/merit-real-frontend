import { create } from 'zustand';
import { readJSON, writeJSON, STORAGE_KEYS } from '../utils/storage';

/**
 * Public Wishlist — separate from the login-gated Buyer "Favourites"
 * feature (src/store/favouritesStore.js, src/pages/buyer/Favourites.jsx),
 * which still works exactly as before for signed-in buyers. This one needs
 * no account: anyone can heart a property from any PropertyCard and it
 * persists straight to localStorage, independent of auth state.
 */
export const useWishlistStore = create((set, get) => ({
  ids: readJSON(STORAGE_KEYS.WISHLIST, []),

  isWishlisted: (propertyId) => get().ids.includes(propertyId),

  toggle: (propertyId) => {
    const current = get().ids;
    const next = current.includes(propertyId)
      ? current.filter((id) => id !== propertyId)
      : [...current, propertyId];
    writeJSON(STORAGE_KEYS.WISHLIST, next);
    set({ ids: next });
    return next.includes(propertyId);
  },

  remove: (propertyId) => {
    const next = get().ids.filter((id) => id !== propertyId);
    writeJSON(STORAGE_KEYS.WISHLIST, next);
    set({ ids: next });
  },
}));
