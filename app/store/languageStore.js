import { createContext, useContext } from 'react';

export const LANGUAGE_KEY = 'dpyb.language';

export const LanguageContext = createContext(null);

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
