// Server-side token signing. Pure-JS SHA-256 HMAC (no node crypto) so the
// same verification works in middleware (Edge runtime) and route handlers.
// Development can use a demo fallback. Production must provide TOKEN_SECRET.

export interface TokenPayload {
  sub: string;
  email: string;
  role?: string;
  employeeId?: string;
  companyId?: string;
  exp: number;
}

const DEMO_SECRET = 'scos-demo-token-secret-change-me-in-prod';

export function getTokenSecret(): string {
  if (typeof process !== 'undefined' && process.env?.TOKEN_SECRET) {
    return process.env.TOKEN_SECRET!;
  }
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    throw new Error('TOKEN_SECRET must be set in production');
  }
  return DEMO_SECRET;
}

/* eslint-disable no-bitwise */
function sha256(message: string | Uint8Array): Uint8Array {
  const data =
    typeof message === 'string' ? new TextEncoder().encode(message) : message;
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ];

  const bitLen = data.length * 8;
  const padded = new Uint8Array((((data.length + 8) >> 6) + 1) << 6);
  padded.set(data);
  padded[data.length] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 4, bitLen >>> 0, false);
  dv.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000), false);

  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => ((x >>> n) | (x << (32 - n))) >>> 0;

  for (let i = 0; i < padded.length; i += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] = dv.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const a = w[t - 15];
      const b = w[t - 2];
      const s0 = (rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3)) >>> 0;
      const s1 = (rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10)) >>> 0;
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e;
      e = (d + temp1) >>> 0;
      d = c; c = b; b = a;
      a = (temp1 + temp2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outDv = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) outDv.setUint32(i * 4, H[i], false);
  return out;
}

function hmac(key: string, message: string | Uint8Array): Uint8Array {
  let k: Uint8Array<ArrayBufferLike> = new TextEncoder().encode(key);
  if (k.length > 64) k = sha256(k);
  const ipad = new Uint8Array(new ArrayBuffer(64)).fill(0x36);
  const opad = new Uint8Array(new ArrayBuffer(64)).fill(0x5c);
  for (let i = 0; i < k.length; i++) {
    ipad[i] ^= k[i];
    opad[i] ^= k[i];
  }
  const msg = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  const inner = new Uint8Array(new ArrayBuffer(ipad.length + msg.byteLength));
  inner.set(ipad, 0);
  inner.set(msg, ipad.length);
  const innerHash = sha256(inner);
  const outer = new Uint8Array(new ArrayBuffer(64 + innerHash.byteLength));
  outer.set(opad, 0);
  outer.set(innerHash, 64);
  return sha256(outer);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function encodeB64(input: string): string {
  try {
    return btoa(input);
  } catch {
    return Buffer.from(input, 'utf-8').toString('base64');
  }
}

function decodeB64(input: string): string {
  try {
    return atob(input);
  } catch {
    return Buffer.from(input, 'base64').toString('utf-8');
  }
}

export function signToken(payload: Omit<TokenPayload, 'exp'> & { exp?: number }): string {
  const body = encodeB64(
    // 7-day session lifetime — short TTLs silently log users out mid-week.
    JSON.stringify({ ...payload, exp: payload.exp ?? Date.now() + 7 * 86400000 })
  );
  const sig = toHex(hmac(getTokenSecret(), body));
  return `${body}.${sig}`;
}

export function verifyToken<TPayload extends TokenPayload = TokenPayload>(
  token: string | null | undefined
): TPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = toHex(hmac(getTokenSecret(), body));
  if (!constantTimeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(decodeB64(body)) as TPayload;
    if (typeof payload?.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
