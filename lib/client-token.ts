// Client-side session token storage with graceful fallbacks.
//
// Embedded/sandboxed contexts (e.g. hosted previews rendered in a cross-site
// iframe) can block BOTH cookies and localStorage. If the app only reads the
// token from localStorage, login "succeeds" but every subsequent API call is
// sent without a token and fails with 401 — pages render empty.
//
// Order of truth: in-memory (always works within the SPA session) →
// localStorage (survives reloads when permitted) → cookie (when permitted).
const TOKEN_KEY = 'scos_token';

let memoryToken: string | null = null;

function cookieAttrs(): string {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  return secure ? '; SameSite=None; Secure; Partitioned' : '; SameSite=Lax';
}

export function storeToken(token: string): void {
  memoryToken = token;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // storage blocked — memory fallback keeps the session alive
  }
  try {
    // Keep the cookie's lifetime in sync with the token TTL (7 days) — a
    // shorter cookie makes the middleware bounce direct page loads to /login
    // while the SPA still holds a valid token, which looks like random logouts.
    document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${7 * 86400}${cookieAttrs()}`;
  } catch {
    // cookies blocked — ignore
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) return t;
  } catch {
    // storage blocked
  }
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_KEY}=([^;]*)`));
    if (m?.[1]) return m[1];
  } catch {
    // cookies blocked
  }
  return memoryToken;
}

export function clearStoredToken(): void {
  memoryToken = null;
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
  try {
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0${cookieAttrs()}`;
  } catch {
    // ignore
  }
}
