import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, getProfile, isConfigured, verifyOAuthState, saveGmailTokens } from '@/lib/gmail-provider';
import { updateEmailSettings, emailSettings } from '@/lib/mock-data';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');
  const home = `${origin}/email`;

  const fail = () => NextResponse.redirect(`${home}?gmail=${encodeURIComponent('error')}`);

  if (error || !code || !isConfigured()) {
    return fail();
  }
  if (!verifyOAuthState(state)) {
    return fail();
  }

  try {
    const { accessToken, refreshToken, expiresIn } = await exchangeCodeForToken(code);
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
    return NextResponse.redirect(`${home}?gmail=connected&account=${encodeURIComponent(profile.email)}`);
  } catch (e) {
    return NextResponse.redirect(`${home}?gmail=${encodeURIComponent((e as Error).message)}`);
  }
}