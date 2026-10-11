import { useEffect, useState, useMemo, useCallback } from 'react';
import { LanguageContext, LANGUAGE_KEY } from './languageStore';
import { translations, formatReadingStatus, formatGenre } from '../i18n/translations';

function loadLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved === 'ko' || saved === 'en') return saved;
  } catch {
    // 무시
  }
  return 'ko'; // 기본값: 한국어
}

function getByDotNotation(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr && typeof curr === 'object' && part in curr) {
      curr = curr[part];
    } else {
      return undefined;
    }
  }
  return curr;
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(loadLanguage);
  const isEn = lang === 'en';
  const isKo = lang === 'ko';

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

  const t = useCallback(
    (keyOrKo, enFallback) => {
      // 1. { ko: '...', en: '...' } 객체 형태 지원
      if (typeof keyOrKo === 'object' && keyOrKo !== null) {
        return isEn ? (keyOrKo.en || keyOrKo.ko) : (keyOrKo.ko || keyOrKo.en);
      }

      // 2. 인라인 인자 t(koText, enText) 형태 지원
      if (enFallback !== undefined) {
        return isEn ? enFallback : keyOrKo;
      }

      // 3. dot notation key (예: 'gnb.myLibrary')
      const targetDict = translations[lang] || translations.ko;
      const val = getByDotNotation(targetDict, keyOrKo);
      if (val !== undefined) return val;

      return keyOrKo;
    },
    [isEn, lang]
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLanguage,
      isEn,
      isKo,
      t,
      formatStatus: (status) => formatReadingStatus(status, isEn),
      formatGenre: (genre) => formatGenre(genre, isEn),
    }),
    [lang, setLang, toggleLanguage, isEn, isKo, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
