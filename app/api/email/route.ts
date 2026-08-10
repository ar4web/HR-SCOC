import { NextResponse } from 'next/server';
import { getEmailSettings, updateSettings, getEmailTemplates, addEmailTemplate, sendTestEmailAsync, sendEmail, getOutbox, deliverOutboxItem, flushOutbox } from '@/lib/email-engine';
import { authFromRequest, hasPermission } from '@/lib/rbac';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'settings:manage')) {
    return NextResponse.json({ error: 'Forbidden: settings managers only' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'settings';

  if (type === 'templates') {
    const filters = {
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
    };
    const data = getEmailTemplates(filters);
    return NextResponse.json({ data, total: data.length });
  }

  if (type === 'outbox') {
    const data = getOutbox();
    return NextResponse.json({ data, total: data.length });
  }

  const settings = { ...getEmailSettings(), gmail: { ...getEmailSettings().gmail } };
  delete settings.gmail.accessToken;
  delete settings.gmail.refreshToken;
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  if (body.action === 'test') {
    if (!hasPermission(auth.role, 'settings:manage')) {
      return NextResponse.json({ error: 'Forbidden: settings managers only' }, { status: 403 });
    }
    const result = await sendTestEmailAsync();
    if (!result.success && result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json(result);
  }

  if (body.action === 'settings') {
    if (!hasPermission(auth.role, 'settings:manage')) {
      return NextResponse.json({ error: 'Forbidden: settings managers only' }, { status: 403 });
    }
    const settings = { ...body };
    delete settings.action;
    return NextResponse.json(updateSettings(settings));
  }

  if (body.action === 'send') {
    const result = sendEmail({
      to: Array.isArray(body.to) ? body.to : [],
      subject: String(body.subject || ''),
      body: String(body.body || ''),
      templateId: body.templateId,
      createdBy: auth.sub,
    });
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Send failed' }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (body.action === 'deliver') {
    if (!hasPermission(auth.role, 'settings:manage')) {
      return NextResponse.json({ error: 'Forbidden: settings managers only' }, { status: 403 });
    }
    if (body.id) {
      const result = await deliverOutboxItem(String(body.id));
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Delivery failed' }, { status: 400 });
      }
      return NextResponse.json(result);
    }
    const result = await flushOutbox();
    return NextResponse.json(result);
  }

  if (body.action === 'template') {
    if (!hasPermission(auth.role, 'settings:manage')) {
      return NextResponse.json({ error: 'Forbidden: settings managers only' }, { status: 403 });
    }
    const data = { ...body };
    delete data.action;
    if (!data.name || !data.subject || !data.body) {
      return NextResponse.json({ error: 'name, subject and body are required' }, { status: 400 });
    }
    const tpl = addEmailTemplate(data);
    return NextResponse.json(tpl, { status: 201 });
  }

  return NextResponse.json({ error: 'Invalid action. Use test, settings, template, send or outbox.' }, { status: 400 });
}