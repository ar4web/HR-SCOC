import { NextResponse } from 'next/server';
import { authFromRequest, hasPermission } from '@/lib/rbac';
import {
  getInvoices,
  getInvoiceStats,
  createInvoice,
  verifyChain,
  getZatcaSettings,
  updateZatcaSettings,
  isValidSaudiVat,
} from '@/lib/zatca-engine';
import { parseWith, invoiceCreateSchema, zatcaSettingsSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'invoice:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'list';

  if (type === 'stats') return NextResponse.json(getInvoiceStats());
  if (type === 'chain') return NextResponse.json(verifyChain());
  if (type === 'settings') return NextResponse.json(getZatcaSettings());

  const data = getInvoices({
    status: searchParams.get('status') || undefined,
    type: searchParams.get('invoiceType') || undefined,
    search: searchParams.get('search') || undefined,
  });
  return NextResponse.json({ data, total: data.length });
}

export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'invoice:write')) {
    return NextResponse.json({ error: 'Forbidden: HR/admin only' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseWith(invoiceCreateSchema, body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const result = createInvoice({ ...parsed.data, createdBy: auth.sub });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result.invoice, { status: 201 });
}

/** PUT /api/invoices — update ZATCA seller settings. */
export async function PUT(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'invoice:write')) {
    return NextResponse.json({ error: 'Forbidden: HR/admin only' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = parseWith(zatcaSettingsSchema, body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (parsed.data.vatNumber !== undefined && !isValidSaudiVat(parsed.data.vatNumber)) {
    return NextResponse.json({ error: 'VAT number must be 15 digits, starting and ending with 3' }, { status: 400 });
  }
  return NextResponse.json(updateZatcaSettings(parsed.data));
}
