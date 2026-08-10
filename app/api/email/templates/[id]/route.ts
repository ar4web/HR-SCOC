import { NextResponse } from 'next/server';
import { getEmailTemplate, updateEmailTemplate, deleteEmailTemplate } from '@/lib/email-engine';
import { authFromRequest, hasPermission } from '@/lib/rbac';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = authFromRequest(_req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const tpl = getEmailTemplate(params.id);
  if (!tpl) return NextResponse.json({ error: 'Email template not found' }, { status: 404 });
  return NextResponse.json(tpl);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'settings:manage')) {
    return NextResponse.json({ error: 'Forbidden: settings managers only' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const result = updateEmailTemplate(params.id, body);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json(result.template);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = authFromRequest(_req);
  if (!auth || !hasPermission(auth.role, 'settings:manage')) {
    return NextResponse.json({ error: 'Forbidden: settings managers only' }, { status: 403 });
  }
  const result = deleteEmailTemplate(params.id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json({ success: true });
}