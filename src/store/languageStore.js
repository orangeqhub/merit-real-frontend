import { create } from 'zustand';
import i18n from '../i18n';
import { readJSON, writeJSON, STORAGE_KEYS } from '../utils/storage';

export const useLanguageStore = create((set) => ({
  language: readJSON(STORAGE_KEYS.LANGUAGE, 'en'),
  setLanguage: (language) => {
    writeJSON(STORAGE_KEYS.LANGUAGE, language);
    i18n.changeLanguage(language);
    set({ language });
  },
  toggleLanguage: () =>
    set((state) => {
      const language = state.language === 'en' ? 'te' : 'en';
      writeJSON(STORAGE_KEYS.LANGUAGE, language);
      i18n.changeLanguage(language);
      return { language };
    }),
}));
