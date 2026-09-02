import { NextResponse } from 'next/server';
import { authFromRequest, hasPermission } from '@/lib/rbac';
import { getInvoice, issueDraft, cancelInvoice, deleteDraft } from '@/lib/zatca-engine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'invoice:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const inv = getInvoice(params.id);
  if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  return NextResponse.json(inv);
}

/** PUT with { action: 'issue' } or { action: 'cancel', reason } */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'invoice:write')) {
    return NextResponse.json({ error: 'Forbidden: HR/admin only' }, { status: 403 });
  }
  const body = await req.json().catch(() => null) as { action?: string; reason?: string } | null;
  if (!body?.action) return NextResponse.json({ error: 'action is required: issue | cancel' }, { status: 400 });

  if (body.action === 'issue') {
    const result = issueDraft(params.id);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result.invoice);
  }
  if (body.action === 'cancel') {
    const result = cancelInvoice(params.id, body.reason || '');
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result.invoice);
  }
  return NextResponse.json({ error: `Unknown action: ${body.action}` }, { status: 400 });
}

/** Drafts only — ZATCA prohibits deleting issued invoices. */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'invoice:write')) {
    return NextResponse.json({ error: 'Forbidden: HR/admin only' }, { status: 403 });
  }
  const result = deleteDraft(params.id);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}
