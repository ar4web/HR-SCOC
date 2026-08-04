'use client';
import { create } from 'zustand';

type Lang = 'en' | 'ar';

interface LanguageState {
  language: Lang;
  dir: 'ltr' | 'rtl';
  setLanguage: (l: Lang) => void;
  toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: 'en',
  dir: 'ltr',
  setLanguage: (language) => {
    const dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    set({ language, dir });
  },
  toggleLanguage: () => get().setLanguage(get().language === 'en' ? 'ar' : 'en'),
}));
