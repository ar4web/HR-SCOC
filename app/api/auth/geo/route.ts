import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

const FLAGS: Record<string, string> = {
  AE: '🇦🇪', SA: '🇸🇦', US: '🇺🇸', GB: '🇬🇧', IN: '🇮🇳', EG: '🇪🇬',
  PK: '🇵🇰', JO: '🇯🇴', LB: '🇱🇧', SY: '🇸🇾', SD: '🇸🇩', YE: '🇾🇪',
  KW: '🇰🇼', QA: '🇶🇦', BH: '🇧🇭', OM: '🇴🇲', TR: '🇹🇷', PH: '🇵🇭',
  BD: '🇧🇩', LK: '🇱🇰', NP: '🇳🇵', DE: '🇩🇪', FR: '🇫🇷', CA: '🇨🇦',
  AU: '🇦🇺',
};

export async function GET(req: Request) {
  const ip =
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1';

  const cfCountry = req.headers.get('cf-ipcountry') || '';
  const country = cfCountry || (ip.startsWith('10.') || ip.startsWith('192.168.') || ip === '127.0.0.1' ? 'local' : '');

  const known = country !== 'local' && country !== '' ? country : 'SA';

  const timeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Riyadh';

  return NextResponse.json({
    ip,
    country: country === 'local' ? 'Local deployment' : known,
    flag: FLAGS[known] || '🌐',
    timeZone,
    localTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    browser: navigatorHint(req),
  });
}

function navigatorHint(req: Request): { name: string; os: string; secure: boolean } {
  const ua = req.headers.get('user-agent') || '';
  let name = 'Browser';
  if (/Chrome/.test(ua) && !/Edg|OPR/.test(ua)) name = 'Chrome';
  else if (/Safari/.test(ua)) name = 'Safari';
  else if (/Firefox/.test(ua)) name = 'Firefox';
  else if (/Edg/.test(ua)) name = 'Edge';

  let os = 'OS';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS/.test(ua)) os = 'macOS';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Linux/.test(ua)) os = 'Linux';

  return { name, os, secure: true };
}