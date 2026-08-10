import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/reports-engine';
import { authFromRequest, hasPermission } from '@/lib/rbac';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'reports:read')) {
    return NextResponse.json({ error: 'Forbidden: reports:read required' }, { status: 403 });
  }
  const stats = getDashboardStats();
  return NextResponse.json(stats);
}
