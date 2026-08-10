import { NextResponse } from 'next/server';
import { buildTimesheetFile } from '@/lib/excel';
import { authFromRequest, hasPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

interface GenRow {
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  breakHours?: number;
  otHours?: number;
  dailyRateOverride?: number;
  otRateOverride?: number;
  notes?: string;
}

export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'payroll:manage')) {
    return NextResponse.json({ error: 'Forbidden: Requires payroll:manage' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const rows: GenRow[] = Array.isArray(body?.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
  }
  if (rows.length > 5000) {
    return NextResponse.json({ error: 'Too many rows (max 5000)' }, { status: 400 });
  }
  const valid = rows.filter((r) => r && r.employeeId && r.date && r.clockIn);
  if (valid.length === 0) {
    return NextResponse.json({ error: 'Each row needs Employee ID, Date and Clock In' }, { status: 400 });
  }

  const buffer = buildTimesheetFile(valid);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="timesheet.xlsx"',
      'Cache-Control': 'no-store',
    },
  });
}