/** Live theme engine — design tokens stored in company.branding.tokens, applied as CSS custom properties at runtime. */

import type { Branding, ThemeTokens } from '@/types';

export type { ThemeTokens };

export interface ThemePreset {
  code: string;
  name: string;
  nameAr: string;
  blurb: string;
  tokens: ThemeTokens;
}

export const ATLAS_NAVY: ThemeTokens = {
  paper: '#eef1f5',
  card: '#ffffff',
  card2: '#f4f6fa',
  ink: '#152033',
  muted: '#5b6780',
  faint: '#8b95a8',
  line: '#e2e6ee',
  line2: '#c9d0dc',
  brand: '#1b3a5f',
  brandStrong: '#132a46',
  brandDeep: '#0c1c30',
  sidebar: '#0e1a2b',
  sidebarText: '#d5deea',
  sidebarMuted: '#7d8ba0',
  accent: '#c4a35a',
  accentSoft: '#f4ead4',
  ok: '#1f7a4d',
  okSoft: '#e2efe4',
  warn: '#b07a16',
  warnSoft: '#f6ecd6',
  err: '#b23a32',
  errSoft: '#f7e4e0',
  info: '#2b5f8a',
  infoSoft: '#e3ebf3',
  radius: '10px',
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    code: 'atlas-navy',
    name: 'Atlas Navy',
    nameAr: 'كحلي أطلس',
    blurb: 'Deep navy + champagne gold — the default corporate look.',
    tokens: ATLAS_NAVY,
  },
  {
    code: 'midnight',
    name: 'Midnight',
    nameAr: 'منتصف الليل',
    blurb: 'Near-black canvas with ice-blue accents. After-hours boardroom.',
    tokens: {
      ...ATLAS_NAVY,
      paper: '#12161d',
      card: '#1b212c',
      card2: '#232b38',
      ink: '#e8edf5',
      muted: '#9aa6b8',
      faint: '#6d788a',
      line: '#2c3544',
      line2: '#3a4558',
      brand: '#4d8ecf',
      brandStrong: '#3b74ad',
      brandDeep: '#1a2a3d',
      sidebar: '#0a0d12',
      sidebarText: '#d7e0ec',
      sidebarMuted: '#6d7a8c',
      accent: '#7ec8e3',
      accentSoft: '#1d3344',
      ok: '#3dba7a',
      okSoft: '#163528',
      warn: '#e0b14a',
      warnSoft: '#3a2e14',
      err: '#e06a62',
      errSoft: '#3a1c1a',
      info: '#6aa8e0',
      infoSoft: '#1a2c3e',
    },
  },
  {
    code: 'sandstone',
    name: 'Sandstone',
    nameAr: 'حجر رملي',
    blurb: 'Warm Gulf sand, copper metal, paper-like surfaces.',
    tokens: {
      ...ATLAS_NAVY,
      paper: '#f3ebe0',
      card: '#fffaf3',
      card2: '#f7efe4',
      ink: '#2c2118',
      muted: '#7a6856',
      faint: '#a39280',
      line: '#e6d8c6',
      line2: '#d2c0a8',
      brand: '#6b3f24',
      brandStrong: '#4e2c18',
      brandDeep: '#2f1a0e',
      sidebar: '#2a1b12',
      sidebarText: '#efe3d4',
      sidebarMuted: '#b49a80',
      accent: '#c47a3a',
      accentSoft: '#f3e0cc',
    },
  },
  {
    code: 'graphite',
    name: 'Graphite',
    nameAr: 'غرافيت',
    blurb: 'Charcoal, silver hairline, quiet luxury.',
    tokens: {
      ...ATLAS_NAVY,
      paper: '#ececee',
      card: '#fafafa',
      card2: '#f2f2f4',
      ink: '#1c1d21',
      muted: '#5e616b',
      faint: '#8d9099',
      line: '#dddfe4',
      line2: '#c5c8d0',
      brand: '#2f323a',
      brandStrong: '#1f2228',
      brandDeep: '#121318',
      sidebar: '#16171b',
      sidebarText: '#e4e6ea',
      sidebarMuted: '#8b8e97',
      accent: '#b8bcc6',
      accentSoft: '#e8eaee',
    },
  },
  {
    code: 'royal',
    name: 'Royal Indigo',
    nameAr: 'نيلي ملكي',
    blurb: 'Indigo ink and amber — formal, ceremonial, Gulf ministries.',
    tokens: {
      ...ATLAS_NAVY,
      paper: '#eef0f7',
      card: '#fbfbfe',
      card2: '#f1f2f9',
      ink: '#1a1830',
      muted: '#5c5a78',
      faint: '#8c8aa6',
      line: '#e0e1ee',
      line2: '#c6c7db',
      brand: '#3b2d7a',
      brandStrong: '#2a2058',
      brandDeep: '#181236',
      sidebar: '#16102c',
      sidebarText: '#e4dff5',
      sidebarMuted: '#9a93b8',
      accent: '#d4a017',
      accentSoft: '#f6e9c4',
    },
  },
  {
    code: 'pearl',
    name: 'Pearl Burgundy',
    nameAr: 'لؤلؤي عنابي',
    blurb: 'Ivory paper, burgundy seals — private-office stationery.',
    tokens: {
      ...ATLAS_NAVY,
      paper: '#f4efe8',
      card: '#fffdf9',
      card2: '#f7f1ea',
      ink: '#2a1c1e',
      muted: '#746062',
      faint: '#a08e90',
      line: '#e6dcd6',
      line2: '#d0c2bb',
      brand: '#7a2433',
      brandStrong: '#5a1a25',
      brandDeep: '#351016',
      sidebar: '#2a1218',
      sidebarText: '#f0e4e6',
      sidebarMuted: '#c4a4aa',
      accent: '#c9a36a',
      accentSoft: '#f3e6cf',
    },
  },
];

function hexToRgbTriplet(hex: string): string {
  const match = hex.replace('#', '');
  const full = match.length === 3 ? match.split('').map((c) => c + c).join('') : match;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return '255 255 255';
  const num = parseInt(full, 16);
  return `${(num >> 16) & 255} ${(num >> 8) & 255} ${num & 255}`;
}

function shade(hex: string, percent: number): string {
  const rgb = hexToRgbTriplet(hex).split(' ').map(Number);
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const r = Math.round((t - rgb[0]) * p) + rgb[0];
  const g = Math.round((t - rgb[1]) * p) + rgb[1];
  const b = Math.round((t - rgb[2]) * p) + rgb[2];
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Map tokens → CSS custom properties. Keeps existing --color-primary/secondary/accent (RGB triplets) working as aliases. */
export function tokensToCssVars(t: ThemeTokens): Record<string, string> {
  return {
    '--paper': t.paper,
    '--card': t.card,
    '--card-2': t.card2,
    '--ink': t.ink,
    '--muted': t.muted,
    '--faint': t.faint,
    '--line': t.line,
    '--line-2': t.line2,
    '--brand': t.brand,
    '--brand-strong': t.brandStrong,
    '--brand-deep': t.brandDeep,
    '--sidebar': t.sidebar,
    '--sidebar-text': t.sidebarText,
    '--sidebar-muted': t.sidebarMuted,
    '--accent': t.accent,
    '--accent-soft': t.accentSoft,
    '--ok': t.ok,
    '--ok-soft': t.okSoft,
    '--warn': t.warn,
    '--warn-soft': t.warnSoft,
    '--err': t.err,
    '--err-soft': t.errSoft,
    '--info': t.info,
    '--info-soft': t.infoSoft,
    '--radius': t.radius,
    '--pine': t.brand,
    '--pine-strong': t.brandStrong,
    '--pine-deep': t.brandDeep,
    '--pine-side': t.sidebar,
    '--brass': t.accent,
    '--brass-soft': t.accentSoft,
    '--color-primary': hexToRgbTriplet(t.brand),
    '--color-primary-light': hexToRgbTriplet(shade(t.brand, 0.15)),
    '--color-primary-dark': hexToRgbTriplet(shade(t.brand, -0.2)),
    '--color-secondary': hexToRgbTriplet(t.brandDeep),
    '--color-secondary-dark': hexToRgbTriplet(shade(t.brandDeep, -0.2)),
    '--color-accent': hexToRgbTriplet(t.accent),
    '--color-background': hexToRgbTriplet(t.paper),
    '--color-surface': hexToRgbTriplet(t.card2),
    '--color-warning': hexToRgbTriplet(t.warn),
    '--color-warning-dark': hexToRgbTriplet(t.warn),
    '--color-success': hexToRgbTriplet(t.ok),
    '--color-error': hexToRgbTriplet(t.err),
    '--color-error-dark': hexToRgbTriplet(t.err),
    '--color-info': hexToRgbTriplet(t.info),
    '--radius-md': t.radius,
    '--radius-lg': t.radius,
    '--radius-xl': t.radius,
  };
}

export function applyThemeToDocument(t: ThemeTokens) {
  if (typeof document === 'undefined') return;
  const vars = tokensToCssVars(t);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
}

export function mergeTokens(stored: Partial<ThemeTokens> | null | undefined): ThemeTokens {
  return { ...ATLAS_NAVY, ...(stored ?? {}) };
}

export function tokensToBranding(t: ThemeTokens, branding: Branding): Branding {
  return {
    ...branding,
    primaryColor: t.brand,
    secondaryColor: t.brandDeep,
    accentColor: t.accent,
    tokens: t,
  };
}

export const TOKEN_FIELDS: Array<{ key: keyof ThemeTokens; label: string; labelAr: string; group: string }> = [
  { key: 'brand', label: 'Brand', labelAr: 'العلامة', group: 'Brand' },
  { key: 'brandStrong', label: 'Brand strong', labelAr: 'العلامة القوية', group: 'Brand' },
  { key: 'brandDeep', label: 'Brand deep', labelAr: 'العلامة العميقة', group: 'Brand' },
  { key: 'accent', label: 'Accent / gold', labelAr: 'التمييز', group: 'Brand' },
  { key: 'accentSoft', label: 'Accent soft', labelAr: 'التمييز الفاتح', group: 'Brand' },
  { key: 'sidebar', label: 'Sidebar', labelAr: 'الشريط الجانبي', group: 'Chrome' },
  { key: 'sidebarText', label: 'Sidebar text', labelAr: 'نص الشريط', group: 'Chrome' },
  { key: 'sidebarMuted', label: 'Sidebar muted', labelAr: 'نص خافت', group: 'Chrome' },
  { key: 'paper', label: 'Page canvas', labelAr: 'خلفية الصفحة', group: 'Surfaces' },
  { key: 'card', label: 'Card', labelAr: 'البطاقة', group: 'Surfaces' },
  { key: 'card2', label: 'Card alt', labelAr: 'بطاقة بديلة', group: 'Surfaces' },
  { key: 'ink', label: 'Ink / text', labelAr: 'الحبر', group: 'Surfaces' },
  { key: 'muted', label: 'Muted text', labelAr: 'نص ثانوي', group: 'Surfaces' },
  { key: 'faint', label: 'Faint text', labelAr: 'نص خافت', group: 'Surfaces' },
  { key: 'line', label: 'Hairline', labelAr: 'الخط', group: 'Surfaces' },
  { key: 'line2', label: 'Hairline strong', labelAr: 'خط قوي', group: 'Surfaces' },
  { key: 'ok', label: 'Success', labelAr: 'نجاح', group: 'Status' },
  { key: 'okSoft', label: 'Success soft', labelAr: 'نجاح فاتح', group: 'Status' },
  { key: 'warn', label: 'Warning', labelAr: 'تحذير', group: 'Status' },
  { key: 'warnSoft', label: 'Warning soft', labelAr: 'تحذير فاتح', group: 'Status' },
  { key: 'err', label: 'Danger', labelAr: 'خطر', group: 'Status' },
  { key: 'errSoft', label: 'Danger soft', labelAr: 'خطر فاتح', group: 'Status' },
  { key: 'info', label: 'Info', labelAr: 'معلومة', group: 'Status' },
  { key: 'infoSoft', label: 'Info soft', labelAr: 'معلومة فاتحة', group: 'Status' },
];