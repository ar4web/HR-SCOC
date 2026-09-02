/**
 * Demo file generators — produce real, previewable file content as base64
 * data URLs for seeded documents (server-side only; uses Buffer).
 *
 * - demoIdCardImage(): SVG identity-card mock rendered by <img> in the gallery/viewer.
 * - demoPdf(): a minimal but VALID single-page PDF (correct xref) rendered by <iframe>.
 * - demoTextFile(): plain-text policy document.
 */

function toDataUrl(mime: string, content: string | Buffer): string {
  const b64 = Buffer.from(content).toString('base64');
  return `data:${mime};base64,${b64}`;
}

/** SVG mock of a Saudi iqama/ID card at 856x540 (85.6mm x 54mm @ 10px/mm). */
export function demoIdCardImage(opts: { name: string; nameAr: string; idNumber: string; expiry: string; accent?: string }): string {
  const accent = opts.accent || '#0F766E';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="856" height="540" viewBox="0 0 856 540">
  <rect width="856" height="540" rx="24" fill="#F8FAFC"/>
  <rect width="856" height="120" rx="24" fill="${accent}"/>
  <rect y="90" width="856" height="30" fill="${accent}"/>
  <text x="40" y="72" font-family="Arial, sans-serif" font-size="30" font-weight="bold" fill="#fff">KINGDOM OF SAUDI ARABIA</text>
  <text x="816" y="72" font-family="Arial, sans-serif" font-size="30" font-weight="bold" fill="#fff" text-anchor="end">المملكة العربية السعودية</text>
  <rect x="40" y="160" width="180" height="220" rx="12" fill="#E2E8F0"/>
  <circle cx="130" cy="240" r="42" fill="#94A3B8"/>
  <path d="M62 380 Q130 300 198 380 L198 380 L62 380 Z" fill="#94A3B8"/>
  <text x="250" y="200" font-family="Arial, sans-serif" font-size="26" fill="#64748B">Name / الاسم</text>
  <text x="250" y="240" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="#0F172A">${opts.name}</text>
  <text x="250" y="282" font-family="Arial, sans-serif" font-size="30" fill="#334155">${opts.nameAr}</text>
  <text x="250" y="340" font-family="Arial, sans-serif" font-size="26" fill="#64748B">ID No. / رقم الهوية</text>
  <text x="250" y="378" font-family="Courier New, monospace" font-size="34" font-weight="bold" fill="#0F172A" letter-spacing="4">${opts.idNumber}</text>
  <text x="40" y="450" font-family="Arial, sans-serif" font-size="24" fill="#64748B">Expiry / الانتهاء</text>
  <text x="40" y="486" font-family="Arial, sans-serif" font-size="30" font-weight="bold" fill="#B91C1C">${opts.expiry}</text>
  <rect x="560" y="420" width="256" height="80" rx="8" fill="#0F172A" opacity="0.85"/>
  <g fill="#F8FAFC">${Array.from({ length: 24 }, (_, i) => `<rect x="${572 + i * 10}" y="432" width="${(i * 7) % 5 + 2}" height="56"/>`).join('')}</g>
  <text x="40" y="528" font-family="Arial, sans-serif" font-size="20" fill="#94A3B8">RESIDENT IDENTITY — DEMO SPECIMEN</text>
</svg>`;
  return toDataUrl('image/svg+xml', svg);
}

/** Minimal valid single-page A4 PDF with a title and body lines. */
export function demoPdf(title: string, lines: string[]): string {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const body = [
    'BT /F1 22 Tf 56 780 Td (' + esc(title) + ') Tj ET',
    'BT /F2 11 Tf 56 750 Td 16 TL',
    ...lines.map((l) => '(' + esc(l) + ') Tj T*'),
    'ET',
    '56 770 m 539 770 l S',
  ].join('\n');

  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>',
    `<< /Length ${body.length} >>\nstream\n${body}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => {
    pdf += `${String(o).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return toDataUrl('application/pdf', pdf);
}

/** Plain-text document (renders inline in the viewer). */
export function demoTextFile(title: string, lines: string[]): string {
  const content = `${title}\n${'='.repeat(title.length)}\n\n${lines.join('\n')}\n`;
  return toDataUrl('text/plain', content);
}
