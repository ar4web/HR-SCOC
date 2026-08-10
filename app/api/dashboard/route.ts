import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/dashboard-engine';
import { authFromRequest } from '@/lib/rbac';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(getDashboardData());
}
