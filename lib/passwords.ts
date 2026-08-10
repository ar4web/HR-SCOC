// Server-only password hashing (node:crypto scrypt). Never import from
// client code. Format: $scrypt$N$r$p$saltB64$hashB64
function getCrypto(): typeof import('crypto') | null {
  if (typeof window !== 'undefined' || typeof process === 'undefined') return null;
  try {
    // eslint-disable-next-line no-eval
    const req = eval('require') as (id: string) => typeof import('crypto');
    return req('crypto');
  } catch {
    return null;
  }
}

const N = 16384, r = 8, p = 1, KEYLEN = 32;

export function hashPassword(plain: string): string {
  const crypto = getCrypto();
  if (!crypto) return `$scrypt$plain$${plain}`;
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(plain, salt, KEYLEN, { N, r, p });
  return `$scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function isHashed(record: string): boolean {
  return record.startsWith('$scrypt$');
}

const OPTIONS: import('crypto').ScryptOptions = { N, r, p };

export function verifyPassword(plain: string, record: string): boolean {
  if (!record) return false;
  if (isHashed(record)) {
    if (record.startsWith('$scrypt$plain$')) {
      return record.slice('$scrypt$plain$'.length) === plain;
    }
    const parts = record.split('$');
    if (parts.length !== 7) return false;
    const n = Number(parts[2]), rr = Number(parts[3]), pp = Number(parts[4]);
    const salt = Buffer.from(parts[5], 'base64');
    const expected = Buffer.from(parts[6], 'base64');
    const crypto = getCrypto();
    if (!crypto) return false;
    if (expected.length !== KEYLEN) return false;
    const actual = crypto.scryptSync(plain, salt, KEYLEN, { ...OPTIONS, N: n, r: rr, p: pp });
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
    return diff === 0;
  }
  // Legacy plaintext record (pre-hash migration): matches, so login works;
  // the login route re-hashes it in place.
  return record === plain;
}

export function shouldRehash(record: string): boolean {
  return !isHashed(record);
}