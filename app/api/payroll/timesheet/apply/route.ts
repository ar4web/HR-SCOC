import { NextResponse } from 'next/server';
import { computeTimesheet, TimesheetRow, TimesheetOptions } from '@/lib/timesheet';
import { processPayrollFromTimesheet } from '@/lib/payroll-engine';
import { authFromRequest, hasPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'payroll:manage')) {
    return NextResponse.json({ error: 'Forbidden: Requires payroll:manage' }, { status: 403 });
  }

  let body: { period?: string; options?: Partial<TimesheetOptions>; rows?: TimesheetRow[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const period = body.period;
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: 'Valid period (YYYY-MM) is required' }, { status: 400 });
  }

  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Rows are required. Upload a timesheet first.' }, { status: 400 });
  }

  const options: TimesheetOptions = {
    otMultiplier: body.options?.otMultiplier ?? 1.5,
    dailyRateMode: body.options?.dailyRateMode || 'auto',
    customDailyRate: body.options?.customDailyRate || undefined,
    customOtRate: body.options?.customOtRate || undefined,
  };

  const { summaries, errors } = computeTimesheet(rows, period, options);

  const result = processPayrollFromTimesheet(period, summaries);

  return NextResponse.json({
    success: true,
    count: result.count,
    errors: [...result.errors, ...errors],
    period,
  });
}