import { NextResponse } from 'next/server';
import { sendExpiryReminders } from '@/lib/document-engine';
import { authFromRequest, hasPermission } from '@/lib/rbac';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'employee:manage')) {
    return NextResponse.json({ error: 'Forbidden: HR/managers only' }, { status: 403 });
  }
  const result = sendExpiryReminders();
  return NextResponse.json(result);
}