import { NextResponse } from 'next/server';
import { getDocuments, addDocument, getDocumentAlerts } from '@/lib/document-engine';
import { employees } from '@/lib/mock-data';
import { authFromRequest, hasPermission } from '@/lib/rbac';
import { parseWith, documentCreateSchema } from '@/lib/validation';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'list';

  if (type === 'alerts') {
    return NextResponse.json(getDocumentAlerts());
  }

  if (type === 'reminders') {
    return NextResponse.json({ error: 'Use POST /api/documents/reminders' }, { status: 405 });
  }

  const filters = {
    category: searchParams.get('category') || undefined,
    status: searchParams.get('status') || undefined,
    search: searchParams.get('search') || undefined,
  };
  let data = getDocuments(filters);
  if (auth.role === 'employee') {
    const emp =
      (auth.employeeId && employees.get(auth.employeeId)) ||
      Array.from(employees.values()).find((e) => e.userId === auth.sub);
    if (!emp) return NextResponse.json({ error: 'No employee linked' }, { status: 404 });
    data = data.filter((d) => !d.owner || d.owner === emp.fullName || d.owner === 'SCOS Corp');
  }
  return NextResponse.json({ data, total: data.length });
}

export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'employee:manage')) {
    return NextResponse.json({ error: 'Forbidden: HR/managers only' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = parseWith(documentCreateSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const doc = addDocument({
    remindDaysBefore: 30,
    ...(parsed.data as object),
    uploadedAt: parsed.data.uploadedAt || new Date().toISOString(),
  } as Parameters<typeof addDocument>[0]);
  return NextResponse.json(doc, { status: 201 });
}