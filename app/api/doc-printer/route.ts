import { NextResponse } from 'next/server';
import { authFromRequest, hasPermission } from '@/lib/rbac';
import { docPrinterAssets, saveDocPrinterAssets } from '@/lib/mock-data';
import { z } from 'zod';
import { parseWith } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const dataUrl = z.string().startsWith('data:image/').max(3 * 1024 * 1024);

const assetsSchema = z.object({
  logo: dataUrl.or(z.literal('')).optional(),
  seal: dataUrl.or(z.literal('')).optional(),
  signature: dataUrl.or(z.literal('')).optional(),
  signatoryName: z.string().max(120).optional(),
  signatoryTitle: z.string().max(120).optional(),
  signatoryTitleAr: z.string().max(120).optional(),
});

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'employee:manage')) {
    return NextResponse.json({ error: 'Forbidden: HR/managers only' }, { status: 403 });
  }
  return NextResponse.json(docPrinterAssets());
}

export async function PUT(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'employee:manage')) {
    return NextResponse.json({ error: 'Forbidden: HR/managers only' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = parseWith(assetsSchema, body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  return NextResponse.json(saveDocPrinterAssets(parsed.data));
}
