import { create } from 'zustand';
import { readJSON, writeJSON, STORAGE_KEYS } from '../utils/storage';
import { generateUuid } from '../utils/ids';

function readAll() {
  return readJSON(STORAGE_KEYS.SAVED_SEARCHES, {});
}

export const useSavedSearchesStore = create((set) => ({
  searches: [],

  refresh: (userId) => {
    if (!userId) return set({ searches: [] });
    const all = readAll();
    set({ searches: all[userId] || [] });
  },

  save: (userId, search) => {
    if (!userId) return;
    const all = readAll();
    const next = [...(all[userId] || []), { id: generateUuid(), createdAt: new Date().toISOString(), ...search }];
    all[userId] = next;
    writeJSON(STORAGE_KEYS.SAVED_SEARCHES, all);
    set({ searches: next });
  },

  remove: (userId, id) => {
    if (!userId) return;
    const all = readAll();
    const next = (all[userId] || []).filter((s) => s.id !== id);
    all[userId] = next;
    writeJSON(STORAGE_KEYS.SAVED_SEARCHES, all);
    set({ searches: next });
  },
}));
