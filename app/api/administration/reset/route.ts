import { NextResponse } from 'next/server';
import { authFromRequest } from '@/lib/rbac';
import { resetDemoData } from '@/lib/mock-data';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  resetDemoData();
  return NextResponse.json({ ok: true, message: 'Demo data has been reset to defaults.' });
}