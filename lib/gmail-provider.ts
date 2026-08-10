import { updateEmailSettings, emailSettings } from '@/lib/mock-data';
import { encryptToken, decryptToken } from '@/lib/crypto-utils';

export function saveGmailTokens(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}): void {
  updateEmailSettings({
    gmail: {
      ...emailSettings.gmail,
      connected: Boolean(emailSettings.gmail?.connected),
      accessToken: encryptToken(tokens.accessToken),
      refreshToken: encryptToken(tokens.refreshToken),
      expiresAt: tokens.expiresAt,
    },
  });
}

export function loadGmailAccessToken(): string {
  return decryptToken(emailSettings.gmail?.accessToken);
}

export function loadGmailRefreshToken(): string {
  return decryptToken(emailSettings.gmail?.refreshToken);
}


const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export interface GmailOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function getOAuthConfig(): GmailOAuthConfig {
  const saved = emailSettings.gmailClientId && emailSettings.gmailClientSecret
    ? { clientId: emailSettings.gmailClientId, clientSecret: emailSettings.gmailClientSecret }
    : { clientId: process.env.GMAIL_CLIENT_ID || '', clientSecret: process.env.GMAIL_CLIENT_SECRET || '' };
  return {
    clientId: saved.clientId,
    clientSecret: saved.clientSecret,
    redirectUri:
      process.env.GMAIL_REDIRECT_URI ||
      emailSettings.gmailRedirectUri ||
      'http://localhost:3001/api/email/gmail/callback',
  };
}

export function isConfigured(): boolean {
  const cfg = getOAuthConfig();
  return Boolean(cfg.clientId && cfg.clientSecret);
}

export function buildAuthUrl(): string {
  const cfg = getOAuthConfig();
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: createOAuthState(),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

const STATE_TTL_MS = 10 * 60 * 1000;
const states = new Map<string, number>();

export function createOAuthState(): string {
  const crypto = require('crypto') as typeof import('crypto');
  const state = crypto.randomBytes(24).toString('hex');
  states.set(state, Date.now());
  return state;
}

export function verifyOAuthState(state: string | null): boolean {
  if (!state) return false;
  const issued = states.get(state);
  if (!issued) return false;
  if (Date.now() - issued > STATE_TTL_MS) {
    states.delete(state);
    return false;
  }
  states.delete(state);
  return true;
}

export async function exchangeCodeForToken(code: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const cfg = getOAuthConfig();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed (${res.status}): ${await res.text()}`);
  }
  const json = await res.json();
  if (!json.access_token) {
    throw new Error('Google token exchange returned no access token');
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || '',
    expiresIn: Number(json.expires_in || 3600),
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const cfg = getOAuthConfig();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token refresh failed (${res.status}): ${await res.text()}`);
  }
  const json = await res.json();
  if (!json.access_token) {
    throw new Error('Google token refresh returned no access token');
  }
  return { accessToken: json.access_token, expiresIn: Number(json.expires_in || 3600) };
}

export async function getProfile(accessToken: string): Promise<{ email: string; name: string }> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google profile fetch failed (${res.status}): ${await res.text()}`);
  const json = await res.json();
  return { email: json.email || '', name: json.name || json.given_name || '' };
}

async function getValidAccessToken(): Promise<string> {
  const gmail = emailSettings.gmail;
  const refreshToken = loadGmailRefreshToken();
  if (!refreshToken) throw new Error('Gmail account not connected');
  if (gmail?.accessToken && gmail?.expiresAt && Date.now() < gmail.expiresAt - 60_000) {
    const cached = loadGmailAccessToken();
    if (cached) return cached;
  }
  const { accessToken, expiresIn } = await refreshAccessToken(refreshToken);
  saveGmailTokens({
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
  });
  return accessToken;
}

function base64UrlEncode(input: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'utf8').toString('base64url');
  }
  return btoa(String.fromCharCode(...new TextEncoder().encode(input)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function buildMimeMessage(opts: {
  from: string;
  fromName: string;
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): string {
  const { from, fromName, to, subject, text, replyTo } = opts;
  const headers = [
    `From: ${fromName} <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=UTF-8',
    replyTo ? `Reply-To: ${replyTo}` : null,
    'MIME-Version: 1.0',
  ]
    .filter(Boolean)
    .join('\r\n');
  return `${headers}\r\n\r\n${text}`;
}

export async function sendViaGmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ id: string }> {
  const accessToken = await getValidAccessToken();
  const mime = base64UrlEncode(
    buildMimeMessage({
      from: emailSettings.gmail?.accountEmail || emailSettings.fromEmail,
      fromName: emailSettings.fromName,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      replyTo: emailSettings.replyTo,
    })
  );
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: mime }),
  });
  if (!res.ok) {
    throw new Error(`Gmail send failed (${res.status}): ${await res.text()}`);
  }
  const json = await res.json();
  return { id: json.id };
}

export async function getGmailProfile(): Promise<{ email: string; name: string }> {
  const accessToken = await getValidAccessToken();
  return getProfile(accessToken);
}