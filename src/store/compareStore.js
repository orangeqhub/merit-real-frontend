import { create } from 'zustand';
import { readJSON, writeJSON, STORAGE_KEYS } from '../utils/storage';

const MAX_COMPARE = 4;
const MIN_COMPARE = 2;

export const useCompareStore = create((set, get) => ({
  ids: readJSON(STORAGE_KEYS.COMPARE, []),

  isSelected: (id) => get().ids.includes(id),

  canAddMore: () => get().ids.length < MAX_COMPARE,

  add: (id) => {
    const { ids } = get();
    if (ids.includes(id)) return { ok: false, reason: 'alreadyAdded' };
    if (ids.length >= MAX_COMPARE) return { ok: false, reason: 'maxReached' };
    const next = [...ids, id];
    writeJSON(STORAGE_KEYS.COMPARE, next);
    set({ ids: next });
    return { ok: true };
  },

  remove: (id) => {
    const next = get().ids.filter((i) => i !== id);
    writeJSON(STORAGE_KEYS.COMPARE, next);
    set({ ids: next });
  },

  toggle: (id) => {
    const { ids, add, remove } = get();
    if (ids.includes(id)) {
      remove(id);
      return { ok: true };
    }
    return add(id);
  },

  clear: () => {
    writeJSON(STORAGE_KEYS.COMPARE, []);
    set({ ids: [] });
  },
}));

export const COMPARE_LIMITS = { MAX_COMPARE, MIN_COMPARE };
