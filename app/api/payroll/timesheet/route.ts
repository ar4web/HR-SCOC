import { NextResponse } from 'next/server';
import { parseTimesheetSheet } from '@/lib/excel';
import { computeTimesheet, TimesheetRow, TimesheetOptions } from '@/lib/timesheet';
import { authFromRequest, hasPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

function parseNumber(value: string | undefined): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number(String(value).replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function parseRows(rows: Record<string, string>[]): TimesheetRow[] {
  return rows.map((row, i) => ({
    rowNumber: i + 1,
    employeeId: (row['Employee ID*'] || '').trim(),
    date: (row['Date (YYYY-MM-DD)*'] || '').trim(),
    clockIn: (row['Clock In (HH:MM)*'] || '').trim(),
    clockOut: (row['Clock Out (HH:MM)'] || '').trim() || undefined,
    breakHours: parseNumber(row['Break Hours']) ?? 0,
    otHours: parseNumber(row['OT Hours*']) ?? 0,
    dailyRateOverride: parseNumber(row['Daily Rate Override (optional)']),
    otRateOverride: parseNumber(row['OT Rate Override/hr (optional)']),
    notes: (row['Notes'] || '').trim() || undefined,
  }));
}

export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'payroll:manage')) {
    return NextResponse.json({ error: 'Forbidden: Requires payroll:manage' }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const period = String(form.get('period') || '');
  const otMultiplier = Number(form.get('otMultiplier') || 1.5);
  const dailyRateMode = String(form.get('dailyRateMode') || 'auto') as TimesheetOptions['dailyRateMode'];
  const customDailyRate = Number(form.get('customDailyRate') || 0) || undefined;
  const customOtRate = Number(form.get('customOtRate') || 0) || undefined;

  if (!/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: 'Invalid period. Use format YYYY-MM (e.g. 2025-01).' }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: 'Timesheet file is required' }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
    return NextResponse.json({ error: 'Please upload an .xlsx or .xls file' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let workbookRows: Record<string, string>[];
  try {
    workbookRows = parseTimesheetSheet(buffer);
  } catch {
    return NextResponse.json({ error: 'Could not read the Excel file. Make sure it is a valid workbook.' }, { status: 400 });
  }

  if (workbookRows.length === 0) {
    return NextResponse.json({ error: 'The file contains no data rows' }, { status: 400 });
  }

  const rows = parseRows(workbookRows);
  const options: TimesheetOptions = {
    otMultiplier: Number.isFinite(otMultiplier) && otMultiplier > 0 ? otMultiplier : 1.5,
    dailyRateMode,
    customDailyRate,
    customOtRate,
  };

  const preview = computeTimesheet(rows, period, options);

  return NextResponse.json({
    success: true,
    period,
    options,
    ...preview,
  });
}