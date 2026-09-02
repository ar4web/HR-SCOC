import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/dashboard-engine';
import { authFromRequest, hasPermission } from '@/lib/rbac';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Company-wide payroll analytics are only exposed to payroll managers.
  const includePayroll = hasPermission(auth.role, 'payroll:manage');
  return NextResponse.json(getDashboardData(includePayroll));
}
