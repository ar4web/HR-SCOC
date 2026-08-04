import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { MODULE_ROUTE_MAP, MODULE_STATES_COOKIE } from '@/lib/module-route-map';

const publicPaths = ['/login'];

function getModuleState(request: NextRequest): Record<string, boolean> {
  const raw = request.cookies.get(MODULE_STATES_COOKIE)?.value;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
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

export function middleware(request: NextRequest) {
  const token = request.cookies.get('scos_token')?.value || 
    request.headers.get('authorization')?.replace('Bearer ', '');

  const { pathname } = request.nextUrl;

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const moduleStates = getModuleState(request);
  if (isModuleDisabled(pathname, moduleStates)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
