'use client';

export function csvEscape(value: unknown): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(rows: Record<string, unknown>[], columns?: { label: string; value: keyof Record<string, unknown> | string }[]): string {
  const headers = columns ? columns.map((c) => c.label) : Object.keys(rows[0] || {});
  const lines: string[] = [headers.join(',')];
  for (const row of rows) {
    const values = columns
      ? columns.map((c) => csvEscape(row[c.value]))
      : headers.map((h) => csvEscape(row[h]));
    lines.push(values.join(','));
  }
  return lines.join('\n');
}

export function downloadCsv(rows: Record<string, unknown>[], filename: string): void {
  const csv = toCsv(rows);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}