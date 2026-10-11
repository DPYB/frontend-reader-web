import { useEffect, useState, useMemo, useCallback } from 'react';
import { LanguageContext, LANGUAGE_KEY } from './languageStore';

function loadLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved === 'ko' || saved === 'en') return saved;
  } catch {
    // 무시
  }
  return 'ko'; // 기본값: 한국어
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(loadLanguage);

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
    try {
      localStorage.setItem(LANGUAGE_KEY, lang);
    } catch {
      // 무시
    }
  }, [lang]);

  const setLang = useCallback((newLang) => {
    if (newLang === 'ko' || newLang === 'en') {
      setLangState(newLang);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLangState((prev) => (prev === 'ko' ? 'en' : 'ko'));
  }, []);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLanguage,
      isEn: lang === 'en',
      isKo: lang === 'ko',
    }),
    [lang, setLang, toggleLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
