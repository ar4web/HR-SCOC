import { NextResponse } from 'next/server';
import { getWPSFile } from '@/lib/payroll-engine';
import { authFromRequest, hasPermission } from '@/lib/rbac';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'payroll:manage')) {
    return NextResponse.json({ error: 'Forbidden: Requires payroll:manage' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period');

  if (!period) {
    return NextResponse.json({ error: 'Period is required' }, { status: 400 });
  }

  const wps = getWPSFile(period);
  return new NextResponse(wps, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="WPS_${period}.txt"`,
    },
  });
}
