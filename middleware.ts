import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { MODULE_ROUTE_MAP, MODULE_STATES_COOKIE } from '@/lib/module-route-map';
import { verifyToken } from '@/lib/token';

const publicPaths = ['/login'];
const publicApiPaths = ['/api/auth/login', '/api/auth/geo', '/api/email/gmail/callback'];
const publicAssetPaths = ['/icon.png', '/manifest.webmanifest', '/sw.js', '/icons/'];

function getModuleState(request: NextRequest): Record<string, boolean> {
  const raw = request.cookies.get(MODULE_STATES_COOKIE)?.value;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const valid: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'boolean' && MODULE_ROUTE_MAP[`/${k}`]) {
        valid[k] = v;
      }
    }
    return valid;
  } catch {
    return {};
  }
}

function isModuleDisabled(pathname: string, states: Record<string, boolean>): boolean {
  const match = Object.entries(MODULE_ROUTE_MAP).find(
    ([route]) => pathname === route || pathname.startsWith(`${route}/`)
  );
  if (!match) return false;
  const [, moduleId] = match;
  return states[moduleId] === false;
}

function extractToken(request: NextRequest): string | null {
  const cookie = request.cookies.get('scos_token')?.value;
  if (cookie) return cookie;
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

function isValidToken(token: string): boolean {
  return verifyToken(token) !== null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (publicApiPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (publicAssetPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = extractToken(request);
  if (!token || !isValidToken(token)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const moduleStates = getModuleState(request);
  if (isModuleDisabled(pathname, moduleStates)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)', '/api/:path*'],
};