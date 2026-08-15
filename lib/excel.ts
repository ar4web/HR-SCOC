import * as XLSX from 'xlsx';
import { Payroll } from '@/types';

export const EMPLOYEE_IMPORT_COLUMNS = [
  { key: 'fullName', label: 'Full Name (EN)*', width: 22 },
  { key: 'fullNameAr', label: 'Full Name (AR)', width: 22 },
  { key: 'email', label: 'Email*', width: 28 },
  { key: 'phone', label: 'Phone', width: 18 },
  { key: 'nationalId', label: 'National ID', width: 18 },
  { key: 'iqamaNumber', label: 'Iqama Number', width: 18 },
  { key: 'nationality', label: 'Nationality', width: 16 },
  { key: 'gender', label: 'Gender (male/female)', width: 20 },
  { key: 'maritalStatus', label: 'Marital Status (single/married/divorced/widowed)', width: 24 },
  { key: 'dateOfBirth', label: 'Date of Birth (YYYY-MM-DD)', width: 22 },
  { key: 'department', label: 'Department', width: 18 },
  { key: 'position', label: 'Position', width: 20 },
  { key: 'hireDate', label: 'Hire Date (YYYY-MM-DD)', width: 22 },
  { key: 'contractType', label: 'Contract Type (permanent/fixed_term/part_time/probationary)', width: 26 },
  { key: 'contractEndDate', label: 'Contract End Date (YYYY-MM-DD)', width: 22 },
  { key: 'basicSalary', label: 'Basic Salary', width: 14 },
  { key: 'housingAllowance', label: 'Housing Allowance', width: 16 },
  { key: 'transportationAllowance', label: 'Transportation Allowance', width: 20 },
  { key: 'otherAllowances', label: 'Other Allowances', width: 16 },
  { key: 'status', label: 'Status (active/inactive/terminated/suspended)', width: 26 },
  { key: 'sponsorName', label: 'Sponsor Name', width: 18 },
  { key: 'sponsorId', label: 'Sponsor ID', width: 14 },
  { key: 'annualVacationDays', label: 'Annual Vacation Days', width: 18 },
  { key: 'vacationBalance', label: 'Vacation Balance (days)', width: 20 },
  { key: 'managerId', label: 'Manager Employee ID', width: 18 },
  { key: 'workPermitExpiry', label: 'Work Permit Expiry (YYYY-MM-DD)', width: 24 },
  { key: 'iqamaExpiryDate', label: 'Iqama Expiry Date (YYYY-MM-DD)', width: 24 },
] as const;

export const TIMESHEET_COLUMNS = [
  { key: 'employeeId', label: 'Employee ID*', width: 16 },
  { key: 'date', label: 'Date (YYYY-MM-DD)*', width: 18 },
  { key: 'clockIn', label: 'Clock In (HH:MM)*', width: 16 },
  { key: 'clockOut', label: 'Clock Out (HH:MM)', width: 16 },
  { key: 'breakHours', label: 'Break Hours', width: 14 },
  { key: 'otHours', label: 'OT Hours*', width: 12 },
  { key: 'dailyRateOverride', label: 'Daily Rate Override (optional)', width: 24 },
  { key: 'otRateOverride', label: 'OT Rate Override/hr (optional)', width: 26 },
  { key: 'notes', label: 'Notes', width: 30 },
] as const;

export interface ImportRow {
  [key: string]: string;
}

function buildSheet(columns: readonly { label: string; width: number }[], example: string[], sheetName: string, instructions: string[]): Buffer {
  const wb = XLSX.utils.book_new();

  const dataSheet = XLSX.utils.aoa_to_sheet([columns.map((c) => c.label), example]);
  dataSheet['!cols'] = columns.map((c) => ({ wch: c.width }));
  XLSX.utils.book_append_sheet(wb, dataSheet, sheetName);

  const readmeSheet = XLSX.utils.aoa_to_sheet([['Instructions'], [], ...instructions.map((i) => [i])]);
  readmeSheet['!cols'] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(wb, readmeSheet, 'Instructions');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function parseWorkbook(buffer: Buffer | ArrayBuffer, sheetName: string): Record<string, string>[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const first = wb.SheetNames.find((n) => n === sheetName) || wb.SheetNames[0];
  if (!first) return [];
  const ws = wb.Sheets[first];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  return rows.map((row) => {
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      clean[k.trim()] = v == null ? '' : String(v).trim();
    }
    return clean;
  });
}

export function buildEmployeeTemplate(): Buffer {
  return buildSheet(
    EMPLOYEE_IMPORT_COLUMNS,
    [
      'Ahmed Al-Qahtani', 'أحمد القحطاني', 'ahmed@scos.sa', '+966512345678', '1054321987',
      '2154321987', 'Saudi', 'male', 'single', '1990-05-15', 'Operations', 'Operations Officer', '2023-01-01',
      'permanent', '2026-12-31', '8000', '2500', '1000', '500', 'active', 'SCOS HR', '12345',
      '30', '22', '2026-12-31', '2026-12-31',
    ],
    'Data',
    [
      'Fill one employee per row in the "Data" sheet. Header row is required.',
      'Required fields: Full Name (ENAR), Email. All other fields are optional with safe defaults.',
      'Dates must use YYYY-MM-DD format (e.g. 1990-05-15).',
      'Gender: male | female. Marital Status: single | married | divorced | widowed.',
      'Contract Type: permanent | fixed_term | part_time | probationary.',
      'Status: active | inactive | terminated | suspended (default active).',
      'Salary is entered as: Basic Salary, Housing Allowance, Transportation Allowance, Other Allowances. Total is computed automatically.',
      'If Manager Employee ID is provided, the employee will be linked to that manager.',
      'Rows missing a name or email will be skipped and reported after import.',
    ]
  );
}

export function parseEmployeeSheet(buffer: Buffer | ArrayBuffer): ImportRow[] {
  return parseWorkbook(buffer, 'Data');
}

export function buildTimesheetTemplate(): Buffer {
  return buildSheet(
    TIMESHEET_COLUMNS,
    ['EMP-001', '2025-01-05', '08:00', '17:00', '1', '2', '', '', 'First week shift'],
    'Timesheet',
    [
      'One row per employee per work day. Fill the "Timesheet" sheet.',
      'Employee ID must match the Employee ID shown in the app (e.g. EMP-001).',
      'Date format: YYYY-MM-DD, inside the payroll period you select.',
      'Clock In / Clock Out format: HH:MM (24-hour). Break Hours and OT Hours are decimal numbers (e.g. 1.5).',
      'Daily Rate Override: optional — if filled, that exact daily rate is used instead of the salary-based rate.',
      'OT Rate Override: optional per-hour overtime rate. If empty, OT is computed as (daily salary / 8 hours) x overtime multiplier.',
      'After uploading you get a preview. Apply to generate payroll records for the period.',
    ]
  );
}

export function parseTimesheetSheet(buffer: Buffer | ArrayBuffer): ImportRow[] {
  return parseWorkbook(buffer, 'Timesheet');
}

export interface TimesheetFileRow {
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

export function buildTimesheetFile(rows: TimesheetFileRow[]): Buffer {
  const wb = XLSX.utils.book_new();
  const header = TIMESHEET_COLUMNS.map((c) => c.label);
  const body = rows.map((r) => ({
    'Employee ID*': r.employeeId,
    'Date (YYYY-MM-DD)*': r.date,
    'Clock In (HH:MM)*': r.clockIn,
    'Clock Out (HH:MM)': r.clockOut ?? '',
    'Break Hours': r.breakHours ?? 0,
    'OT Hours*': r.otHours ?? 0,
    'Daily Rate Override (optional)': r.dailyRateOverride ?? '',
    'OT Rate Override/hr (optional)': r.otRateOverride ?? '',
    Notes: r.notes ?? '',
  }));
  const dataSheet = XLSX.utils.json_to_sheet(body);
  dataSheet['!cols'] = TIMESHEET_COLUMNS.map((c) => ({ wch: c.width }));
  XLSX.utils.book_append_sheet(wb, dataSheet, 'Timesheet');
  const readmeSheet = XLSX.utils.aoa_to_sheet([
    ['Instructions'],
    [],
    ['One row per employee per work day.', `Employee ID must match the Employee ID shown in the app (e.g. ${header[0]}).`],
    ['Dates must be inside the payroll period you select, formatted YYYY-MM-DD.'],
    ['Upload this file above to preview, then Apply to generate payroll records.'],
  ]);
  readmeSheet['!cols'] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(wb, readmeSheet, 'Instructions');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export function buildExportSheet(sheetName: string, rows: Record<string, string | number>[]): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  const keys = rows.length > 0 ? Object.keys(rows[0]) : [];
  ws['!cols'] = keys.map((k) => ({
    wch: Math.max(k.length + 2, ...rows.slice(0, 200).map((r) => String(r[k] ?? '').length + 2)),
  }));
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export function buildEmployeesExport(
  empList: { employeeId: string; fullName: string; fullNameAr: string; email: string; nationality: string; gender: string; department: string; position: string; contractType: string; hireDate: string; basic: number; housing: number; transportation: number; otherAllowances: number; total: number; bankName: string; iban: string }[]
): Buffer {
  const rows = empList.map((e) => ({
    'Employee ID': e.employeeId,
    Name: e.fullName,
    'Arabic Name': e.fullNameAr,
    Email: e.email,
    Nationality: e.nationality,
    Gender: e.gender,
    Department: e.department,
    Position: e.position,
    'Contract Type': e.contractType,
    'Hire Date': e.hireDate,
    'Basic Salary': e.basic,
    Housing: e.housing,
    Transportation: e.transportation,
    'Other Allowances': e.otherAllowances,
    'Total Salary': e.total,
    'Bank Name': e.bankName,
    IBAN: e.iban,
  }));
  return buildExportSheet('Employees', rows);
}

export function buildPayrollExport(payrolls: Payroll[]): Buffer {
  const rows = payrolls.map((p) => ({
    Period: p.period,
    'Employee ID': p.employeeDisplayId || p.employeeId,
    Name: p.employeeName || p.employeeId,
    'Basic Salary': p.salary?.basic ?? 0,
    Housing: p.salary?.housing ?? 0,
    Transportation: p.salary?.transportation ?? 0,
    'Other Allowances': p.salary?.otherAllowances ?? 0,
    'Timesheet Days': p.timesheet?.daysWorked ?? '',
    'OT Hours': p.timesheet?.otHours ?? '',
    'OT Pay': p.timesheet?.otPay ?? 0,
    'Gross Pay': p.timesheet?.grossPay ?? (p.salary?.total ?? 0),
    GOSI: p.gosiContribution ?? 0,
    NetPay: p.netPay,
    Status: p.status,
    'Processed At': p.processedAt || '',
  }));
  return buildExportSheet('Payroll', rows);
}
