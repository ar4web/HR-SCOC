import { NextResponse } from 'next/server';
import { buildTimesheetTemplate } from '@/lib/excel';
import { authFromRequest, hasPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'payroll:view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const buffer = buildTimesheetTemplate();
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="timesheet-template.xlsx"',
      'Cache-Control': 'no-store',
    },
  });
}