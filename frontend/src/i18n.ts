import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationEN from './locales/en/translation.json';
import translationTA from './locales/ta/translation.json';
import translationSI from './locales/si/translation.json';

const resources = {
  en: {
    translation: translationEN
  },
  ta: {
    translation: translationTA
  },
  si: {
    translation: translationSI
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
