import React, { createContext, useContext, useState } from 'react';
import en from '../i18n/en.json';
import rw from '../i18n/rw.json';
import fr from '../i18n/fr.json';
import sw from '../i18n/sw.json';

const translations = { en, rw, fr, sw };

export const LANGUAGES = [
  { code: 'en', label: 'English',    shortLabel: 'EN', flag: '🇬🇧' },
  { code: 'rw', label: 'Kinyarwanda', shortLabel: 'RW', flag: '🇷🇼' },
  { code: 'fr', label: 'Français',   shortLabel: 'FR', flag: '🇫🇷' },
  { code: 'sw', label: 'Kiswahili',  shortLabel: 'SW', flag: '🇹🇿' },
];

const LangContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('plani_lang');
    return translations[saved] ? saved : 'en';
  });

  const t = (key) => {
    const keys = key.split('.');
    let val = translations[lang];
    for (const k of keys) val = val?.[k];
    if (!val && lang !== 'en') {
      let fallback = translations['en'];
      for (const k of keys) fallback = fallback?.[k];
      return fallback || key;
    }
    return val || key;
  };

  const switchLang = (newLang) => {
    if (!translations[newLang]) return;
    setLang(newLang);
    localStorage.setItem('plani_lang', newLang);
  };

  return (
    <LangContext.Provider value={{ lang, t, switchLang, languages: LANGUAGES }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
};
