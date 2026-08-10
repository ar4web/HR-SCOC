// Server-only AES-256-GCM helpers for encrypting OAuth tokens at rest.
// Key is derived from TOKEN_SECRET (see lib/token.ts). Never import this
// from client code (it uses node:crypto).
import { getTokenSecret } from '@/lib/token';

function getKey(): Buffer {
  const crypto = require('crypto') as typeof import('crypto');
  return crypto.createHash('sha256').update(getTokenSecret(), 'utf-8').digest();
}

export function encryptToken(value: string): string {
  if (!value) return '';
  const crypto = require('crypto') as typeof import('crypto');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const ct = Buffer.concat([cipher.update(value, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

export function decryptToken(payload: string | undefined | null): string {
  if (!payload) return '';
  const crypto = require('crypto') as typeof import('crypto');
  try {
    const [version, ivB64, tagB64, ctB64] = payload.split(':');
    if (version !== 'v1' || !ivB64 || !tagB64 || !ctB64) return ''; // not encrypted (legacy)
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(ctB64, 'base64')),
      decipher.final(),
    ]).toString('utf-8');
  } catch {
    return '';
  }
}