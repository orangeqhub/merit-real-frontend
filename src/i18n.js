import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import teCommon from './locales/te/common.json';
import enProperties from './locales/en/properties.json';
import teProperties from './locales/te/properties.json';
import enDashboard from './locales/en/dashboard.json';
import teDashboard from './locales/te/dashboard.json';
import enForms from './locales/en/forms.json';
import teForms from './locales/te/forms.json';
import enAuth from './locales/en/auth.json';
import teAuth from './locales/te/auth.json';
import { readJSON, STORAGE_KEYS } from './utils/storage';

const savedLanguage = readJSON(STORAGE_KEYS.LANGUAGE, 'en');

i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon, properties: enProperties, dashboard: enDashboard, forms: enForms, auth: enAuth },
    te: { common: teCommon, properties: teProperties, dashboard: teDashboard, forms: teForms, auth: teAuth },
  },
  lng: savedLanguage,
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'properties', 'dashboard', 'forms', 'auth'],
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export default i18n;
