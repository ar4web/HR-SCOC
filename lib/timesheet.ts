import { employees } from '@/lib/mock-data';

export interface TimesheetRow {
  rowNumber: number;
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  breakHours: number;
  otHours: number;
  dailyRateOverride?: number;
  otRateOverride?: number;
  notes?: string;
}

export interface TimesheetOptions {
  otMultiplier: number;
  dailyRateMode: 'auto' | 'custom';
  customDailyRate?: number;
  customOtRate?: number;
}

export interface EmployeeTimesheetSummary {
  employeeId: string;
  employeeDisplayId: string;
  fullName: string;
  department: string;
  daysWorked: number;
  regularHours: number;
  otHours: number;
  dailyRate: number;
  basePay: number;
  otRate: number;
  otPay: number;
  grossPay: number;
}

export interface TimesheetPreview {
  rows: TimesheetRow[];
  summaries: EmployeeTimesheetSummary[];
  errors: string[];
  totals: {
    daysWorked: number;
    otHours: number;
    basePay: number;
    otPay: number;
    grossPay: number;
  };
}

export const DEFAULT_TIMESHEET_OPTIONS: TimesheetOptions = {
  otMultiplier: 1.5,
  dailyRateMode: 'auto',
  customDailyRate: undefined,
  customOtRate: undefined,
};

function parseTime(value: string): number | null {
  const m = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return h + min / 60;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeTimesheet(
  rows: TimesheetRow[],
  period: string,
  options: TimesheetOptions = DEFAULT_TIMESHEET_OPTIONS
): TimesheetPreview {
  const [year, month] = period.split('-').map(Number);
  const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const errors: string[] = [];
  const byEmployee = new Map<string, TimesheetRow[]>();

  for (const row of rows) {
    if (!row.employeeId) {
      errors.push(`Row ${row.rowNumber}: missing Employee ID`);
      continue;
    }
    if (row.date < periodStart || row.date > periodEnd) {
      errors.push(`Row ${row.rowNumber}: date ${row.date} is outside period ${period}`);
      continue;
    }
    if (!row.clockIn) {
      errors.push(`Row ${row.rowNumber}: missing Clock In time`);
      continue;
    }
    const emp = Array.from(employees.values()).find(
      (e) => e.employeeId.toLowerCase() === row.employeeId.toLowerCase() || e.id === row.employeeId
    );
    if (!emp) {
      errors.push(`Row ${row.rowNumber}: unknown Employee ID ${row.employeeId}`);
      continue;
    }

    const list = byEmployee.get(emp.id) || [];
    list.push(row);
    byEmployee.set(emp.id, list);
  }

  const summaries: EmployeeTimesheetSummary[] = [];

  for (const [empId, empRows] of byEmployee) {
    const emp = employees.get(empId);
    if (!emp) continue;

    const grossMonthly = emp.salary.basic + emp.salary.housing + emp.salary.transportation + emp.salary.otherAllowances;
    const autoDailyRate = grossMonthly > 0 ? round2(grossMonthly / 30) : 0;

    let daysWorked = 0;
    let regularHours = 0;
    let otHours = 0;

    for (const row of empRows) {
      const inTime = parseTime(row.clockIn);
      const outTime = row.clockOut ? parseTime(row.clockOut) : null;
      if (outTime != null && inTime != null && outTime > inTime) {
        regularHours += round2(outTime - inTime - (row.breakHours || 0));
      }
      daysWorked += 1;
      otHours += row.otHours || 0;
    }

    const dailyRateOverride = empRows.find((r) => r.dailyRateOverride != null && r.dailyRateOverride > 0)?.dailyRateOverride;
    const dailyRate = dailyRateOverride ?? (options.dailyRateMode === 'custom' && options.customDailyRate ? options.customDailyRate : autoDailyRate);

    const otRateOverride = empRows.find((r) => r.otRateOverride != null && r.otRateOverride > 0)?.otRateOverride;
    const otRate = otRateOverride ?? (options.customOtRate ? options.customOtRate : round2((dailyRate / 8) * options.otMultiplier));

    const basePay = round2(daysWorked * dailyRate);
    const otPay = round2(otHours * otRate);
    const grossPay = round2(basePay + otPay);

    summaries.push({
      employeeId: emp.id,
      employeeDisplayId: emp.employeeId,
      fullName: emp.fullName,
      department: emp.department,
      daysWorked,
      regularHours: round2(regularHours),
      otHours: round2(otHours),
      dailyRate,
      basePay,
      otRate,
      otPay,
      grossPay,
    });
  }

  summaries.sort((a, b) => a.employeeDisplayId.localeCompare(b.employeeDisplayId));

  const totals = summaries.reduce(
    (acc, s) => ({
      daysWorked: acc.daysWorked + s.daysWorked,
      otHours: acc.otHours + s.otHours,
      basePay: round2(acc.basePay + s.basePay),
      otPay: round2(acc.otPay + s.otPay),
      grossPay: round2(acc.grossPay + s.grossPay),
    }),
    { daysWorked: 0, otHours: 0, basePay: 0, otPay: 0, grossPay: 0 }
  );

  return { rows, summaries, errors, totals };
}