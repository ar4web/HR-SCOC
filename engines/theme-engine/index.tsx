'use client';

import React from 'react';
import { useCompanyStore } from '@/stores/company-store';
import { Branding, ThemeVariant } from '@/types';
import { applyThemeToDocument, mergeTokens, THEME_PRESETS, type ThemeTokens } from '@/lib/theme-tokens';

export interface ThemeContextValue {
  theme: ThemeVariant;
  branding: Branding | null;
  tokens: ThemeTokens;
  themeCode: string;
  setTheme: (theme: ThemeVariant) => void;
  applyBranding: (branding: Branding) => void;
  setLiveTokens: (tokens: ThemeTokens) => void;
  resolvedDark: boolean;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

const DEFAULT_BRANDING: Branding = {
  primaryColor: '#009B77',
  secondaryColor: '#00205B',
  accentColor: '#FFC72C',
  theme: 'light',
};

function hexToRgb(hex: string): string | null {
  const match = hex.replace('#', '');
  const full = match.length === 3 ? match.split('').map((c) => c + c).join('') : match;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const num = parseInt(full, 16);
  return `${(num >> 16) & 255} ${(num >> 8) & 255} ${num & 255}`;
}

function shade(hex: string, percent: number): string {
  const rgb = hexToRgb(hex)?.split(' ').map(Number);
  if (!rgb) return hex;
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const r = Math.round((t - rgb[0]) * p) + rgb[0];
  const g = Math.round((t - rgb[1]) * p) + rgb[1];
  const b = Math.round((t - rgb[2]) * p) + rgb[2];
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function toRgbTriplet(hex: string): string {
  return hexToRgb(hex) || '0 155 119';
}

function resolveDark(theme: ThemeVariant): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function codeForTokens(tokens: ThemeTokens): string {
  const match = THEME_PRESETS.find((p) => {
    const a = p.tokens;
    const b = tokens;
    return a.brand === b.brand && a.accent === b.accent && a.sidebar === b.sidebar && a.paper === b.paper;
  });
  return match?.code || 'custom';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const company = useCompanyStore((s) => s.company);
  const [branding, setBranding] = React.useState<Branding | null>(null);
  const [tokens, setTokens] = React.useState<ThemeTokens>(mergeTokens(null));
  const [theme, setThemeState] = React.useState<ThemeVariant>('light');
  const [systemDark, setSystemDark] = React.useState(false);

  React.useEffect(() => {
    const current = company?.branding || branding;
    if (current) {
      setBranding(current);
      setThemeState(current.theme || 'light');
      if (current.tokens) {
        const merged = mergeTokens(current.tokens);
        setTokens(merged);
        applyThemeToDocument(merged);
      } else {
        applyBrandingVars(current);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.branding]);

  React.useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setSystemDark(media.matches);
    handler();
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const resolvedDark = resolveDark(theme) || (theme === 'auto' && systemDark);

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedDark);
  }, [resolvedDark]);

  const applyBranding = React.useCallback((next: Branding) => {
    setBranding(next);
    setThemeState(next.theme || 'light');
    if (next.tokens) {
      const merged = mergeTokens(next.tokens);
      setTokens(merged);
      applyThemeToDocument(merged);
    } else {
      applyBrandingVars(next);
    }
  }, []);

  const setTheme = React.useCallback((next: ThemeVariant) => {
    setThemeState(next);
    if (branding) {
      applyBranding({ ...branding, theme: next });
    }
  }, [branding, applyBranding]);

  const setLiveTokens = React.useCallback((next: ThemeTokens) => {
    setTokens(next);
    applyThemeToDocument(next);
  }, []);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      branding,
      tokens,
      themeCode: codeForTokens(tokens),
      setTheme,
      applyBranding,
      setLiveTokens,
      resolvedDark,
    }),
    [theme, branding, tokens, setTheme, applyBranding, setLiveTokens, resolvedDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

function applyBrandingVars(branding: Branding) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const effective = {
    ...DEFAULT_BRANDING,
    ...branding,
  };
  root.style.setProperty('--color-primary', toRgbTriplet(effective.primaryColor));
  root.style.setProperty('--color-primary-light', toRgbTriplet(shade(effective.primaryColor, 0.15)));
  root.style.setProperty('--color-primary-dark', toRgbTriplet(shade(effective.primaryColor, -0.2)));
  root.style.setProperty('--color-secondary', toRgbTriplet(effective.secondaryColor));
  root.style.setProperty('--color-secondary-dark', toRgbTriplet(shade(effective.secondaryColor, -0.2)));
  root.style.setProperty('--color-accent', toRgbTriplet(effective.accentColor));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', effective.primaryColor);
  }
}