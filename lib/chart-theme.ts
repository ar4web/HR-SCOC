/** Shared chart palette derived from live theme tokens so every visual color is manageable from Settings. */

import React from 'react';
import { useTheme } from '@/engines/theme-engine';
import type { ThemeTokens } from '@/types';

export interface ChartTheme {
  palette: string[];
  ok: string;
  warn: string;
  err: string;
  info: string;
  brand: string;
  accent: string;
  muted: string;
  faint: string;
  line: string;
}

export function chartThemeFromTokens(t: ThemeTokens): ChartTheme {
  return {
    palette: [t.brand, t.ok, t.accent, t.info, t.warn, t.err, t.faint],
    brand: t.brand,
    accent: t.accent,
    ok: t.ok,
    warn: t.warn,
    err: t.err,
    info: t.info,
    muted: t.muted,
    faint: t.faint,
    line: t.line,
  };
}

export function useChartTheme(): ChartTheme {
  const { tokens } = useTheme();
  return React.useMemo(() => chartThemeFromTokens(tokens), [tokens]);
}

const DEFAULT_STATUS: Record<string, keyof Omit<ChartTheme, 'palette'>> = {
  active: 'ok',
  present: 'ok',
  approved: 'ok',
  inactive: 'faint',
  cancelled: 'faint',
  terminated: 'err',
  absent: 'err',
  rejected: 'err',
  suspended: 'warn',
  late: 'warn',
  pending: 'warn',
  half_day: 'info',
};

export function statusHexMap(t: ChartTheme): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, token] of Object.entries(DEFAULT_STATUS) as Array<[string, keyof Omit<ChartTheme, 'palette'>]>) {
    out[key] = t[token];
  }
  return out;
}

export function leafHexMap(t: ChartTheme): Record<string, string> {
  return { approved: t.ok, pending: t.warn, rejected: t.err };
}