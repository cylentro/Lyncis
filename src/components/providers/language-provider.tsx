'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { Locale, getDictionary, Dictionary } from '@/i18n/get-dictionary';

type LanguageContextType = {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  const dict = useMemo(() => getDictionary(initialLocale), [initialLocale]);

  const setLocale = (newLocale: Locale) => {
    // Set cookie that expires in 1 year
    document.cookie = `lyncis-locale=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    // Refresh to apply server-side changes and update context
    window.location.reload();
  };

  const value = useMemo(
    () => ({
      locale: initialLocale,
      dict,
      setLocale,
    }),
    [initialLocale, dict]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
