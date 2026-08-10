import { NextRequest, NextResponse } from 'next/server';
import {
  isConfigured,
  buildAuthUrl,
  exchangeCodeForToken,
  getProfile,
  refreshAccessToken,
  saveGmailTokens,
  loadGmailRefreshToken,
} from '@/lib/gmail-provider';
import { updateEmailSettings, emailSettings } from '@/lib/mock-data';
import { authFromRequest, hasPermission } from '@/lib/rbac';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'status';

  if (action === 'status') {
    const gmail = emailSettings.gmail;
    const configured = isConfigured();
    return NextResponse.json({
      success: true,
      data: {
        configured,
        connected: Boolean(gmail?.connected),
        accountEmail: gmail?.accountEmail,
        accountName: gmail?.accountName,
        authUrl: configured && hasPermission(auth.role, 'settings:manage') ? buildAuthUrl() : null,
        authMissing: !configured,
      },
    });
  }

  if (action === 'auth') {
    if (!auth || !hasPermission(auth.role, 'settings:manage')) {
      return NextResponse.json({ error: 'Forbidden: settings managers only' }, { status: 403 });
    }
    if (!isConfigured()) {
      return NextResponse.json({ error: 'Gmail OAuth credentials are not configured (set GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REDIRECT_URI)' }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: { url: buildAuthUrl() } });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'settings:manage')) {
    return NextResponse.json({ error: 'Forbidden: settings managers only' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const action = body?.action;

  if (action === 'disconnect') {
    updateEmailSettings({ gmail: { ...emailSettings.gmail, connected: false } });
    return NextResponse.json({ success: true, message: 'Gmail disconnected' });
  }

  if (action === 'refresh') {
    const refreshToken = loadGmailRefreshToken();
    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token to refresh' }, { status: 400 });
    }
    try {
      const { accessToken, expiresIn } = await refreshAccessToken(refreshToken);
      saveGmailTokens({
        accessToken,
        refreshToken,
        expiresAt: Date.now() + expiresIn * 1000,
      });
      return NextResponse.json({ success: true, data: { refreshed: true } });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function PUT(req: NextRequest) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'settings:manage')) {
    return NextResponse.json({ error: 'Forbidden: settings managers only' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Gmail OAuth is not configured' }, { status: 400 });
  }
  if (!body?.code) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 });
  }
  try {
    const { accessToken, refreshToken, expiresIn } = await exchangeCodeForToken(String(body.code));
    const profile = await getProfile(accessToken);
    saveGmailTokens({
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
    });
    updateEmailSettings({
      provider: 'gmail',
      fromEmail: profile.email,
      gmail: {
        ...emailSettings.gmail,
        connected: true,
        accountEmail: profile.email,
        accountName: profile.name,
      },
    });
    return NextResponse.json({ success: true, data: { accountEmail: profile.email, accountName: profile.name } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}