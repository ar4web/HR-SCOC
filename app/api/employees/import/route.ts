import { NextResponse } from 'next/server';
import { parseEmployeeSheet } from '@/lib/excel';
import { employees, addEmployee } from '@/lib/mock-data';
import { authFromRequest, hasPermission } from '@/lib/rbac';
import { Employee, ContractType, EmployeeStatus } from '@/types';

export const dynamic = 'force-dynamic';

const CONTRACT_TYPES: ContractType[] = ['permanent', 'fixed_term', 'part_time', 'probation'];
const STATUSES: EmployeeStatus[] = ['active', 'inactive', 'terminated', 'suspended'];
const GENDERS = ['male', 'female'];
const MARITAL = ['single', 'married', 'divorced', 'widowed'];

interface ParsedRow {
  rowNumber: number;
  data: Record<string, unknown>;
  valid: boolean;
  errors: string[];
}

function toNumber(value: string | undefined): number {
  if (value == null || value === '') return 0;
  const n = Number(String(value).replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function isoDate(value: string | undefined): string | undefined {
  if (!value || value === '') return undefined;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  const d = new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

function toEmployeePayload(
  parsed: ParsedRow,
  companyId: string
): Omit<Employee, 'id' | 'employeeId' | 'createdAt' | 'updatedAt'> {
  const d = parsed.data as Record<string, unknown>;
  return {
    companyId,
    fullName: d.fullName as string,
    fullNameAr: (d.fullNameAr as string) || (d.fullName as string),
    email: d.email as string,
    phone: (d.phone as string) || '',
    nationalId: (d.nationalId as string) || '',
    iqamaNumber: (d.iqamaNumber as string) || undefined,
    nationality: (d.nationality as string) || 'Saudi',
    religion: 'muslim',
    gender: d.gender as Employee['gender'],
    maritalStatus: d.maritalStatus as Employee['maritalStatus'],
    dateOfBirth: (d.dateOfBirth as string) || '1990-01-01',
    hireDate: d.hireDate as string,
    contractType: d.contractType as ContractType,
    contractEndDate: (d.contractEndDate as string) || undefined,
    department: (d.department as string) || 'General',
    position: (d.position as string) || 'Staff',
    salary: {
      basic: Number(d.basicSalary) || 0,
      housing: Number(d.housingAllowance) || 0,
      transportation: Number(d.transportationAllowance) || 0,
      otherAllowances: Number(d.otherAllowances) || 0,
      total: 0,
      bankName: '',
      bankAccount: '',
      iban: '',
    },
    address: { street: '', city: '', region: '', postalCode: '', country: 'Saudi Arabia' },
    emergencyContact: { name: '', relation: '', phone: '' },
    status: d.status as EmployeeStatus,
    documents: [],
    sponsorName: (d.sponsorName as string) || undefined,
    sponsorId: (d.sponsorId as string) || undefined,
    annualVacationDays: (d.annualVacationDays as number) || undefined,
    vacationBalance: (d.vacationBalance as number) || undefined,
    managerId: (d.managerId as string) || undefined,
    workPermitExpiry: isoDate(d.workPermitExpiry as string) || undefined,
    iqamaExpiryDate: isoDate(d.iqamaExpiryDate as string) || undefined,
  };
}

export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'employee:manage')) {
    return NextResponse.json({ error: 'Forbidden: Requires employee:manage' }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const action = String(form.get('action') || 'preview');

  if (!file) {
    return NextResponse.json({ error: 'Excel file is required' }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
    return NextResponse.json({ error: 'Please upload an .xlsx or .xls file' }, { status: 400 });
  }
  if (file.type && !['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'application/octet-stream', 'application/zip'].includes(file.type)) {
    return NextResponse.json({ error: 'Uploaded file is not a valid Excel workbook' }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: Record<string, string>[];
  try {
    rows = parseEmployeeSheet(buffer);
  } catch {
    return NextResponse.json({ error: 'Could not read the Excel file. Make sure it is a valid workbook.' }, { status: 400 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'The file contains no data rows' }, { status: 400 });
  }

  const parsed = rows.map((row, i) => parseEmployeeRow(row, i + 1));

  const existingEmails = new Set(Array.from(employees.values()).map((e) => e.email.toLowerCase()));
  const seenEmails = new Set<string>();
  const seenNationalIds = new Set(Array.from(employees.values()).map((e) => e.nationalId.toLowerCase()));

  for (const p of parsed) {
    const email = (p.data.email as string) || '';
    const nationalId = (p.data.nationalId as string) || '';
    if (p.valid && email) {
      if (existingEmails.has(email.toLowerCase()) || seenEmails.has(email.toLowerCase())) {
        p.errors.push('Duplicate email in system or file');
        p.valid = false;
      } else {
        seenEmails.add(email.toLowerCase());
      }
    }
    if (p.valid && nationalId && seenNationalIds.has(nationalId.toLowerCase())) {
      p.errors.push('Duplicate National ID in system');
      p.valid = false;
    } else if (nationalId) {
      seenNationalIds.add(nationalId.toLowerCase());
    }
  }

  const preview = parsed.map((p) => ({
    rowNumber: p.rowNumber,
    name: p.data.fullName as string,
    email: p.data.email as string,
    department: p.data.department as string,
    position: p.data.position as string,
    salary: (Number(p.data.basicSalary) || 0) + (Number(p.data.housingAllowance) || 0) + (Number(p.data.transportationAllowance) || 0) + (Number(p.data.otherAllowances) || 0),
    valid: p.valid,
    errors: p.errors,
  }));

  if (action === 'import') {
    const valid = parsed.filter((p) => p.valid);
    const created: { employeeId: string; fullName: string; email: string }[] = [];
    const failures = parsed.filter((p) => !p.valid);

    for (const p of valid) {
      try {
        const employee = addEmployee(toEmployeePayload(p, auth.companyId || 'demo-company'));
        created.push({ employeeId: employee.employeeId, fullName: employee.fullName, email: employee.email });
      } catch {
        failures.push({ ...p, errors: [...p.errors, 'Failed to create employee record'] });
      }
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      skipped: failures.length,
      preview,
      createdRecords: created,
      failures: failures.map((f) => ({ rowNumber: f.rowNumber, errors: f.errors })),
    });
  }

  return NextResponse.json({
    success: true,
    action: 'preview',
    total: parsed.length,
    validCount: parsed.filter((p) => p.valid).length,
    preview,
  });
}

function parseEmployeeRow(row: Record<string, string>, rowNumber: number): ParsedRow {
  const errors: string[] = [];

  const fullName = row['Full Name (EN)*'] || '';
  const email = row['Email*'] || '';

  if (!fullName) errors.push('Full Name is required');
  if (!email) errors.push('Email is required');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email format');

  const dateKeys: Record<string, string> = {
    'Date of Birth (YYYY-MM-DD)': 'dateOfBirth',
    'Hire Date (YYYY-MM-DD)': 'hireDate',
    'Contract End Date (YYYY-MM-DD)': 'contractEndDate',
  };
  for (const [label] of Object.entries(dateKeys)) {
    const raw = row[label] || '';
    if (raw) {
      const date = isoDate(raw);
      if (!date) {
        errors.push(`${label} must be YYYY-MM-DD`);
      }
    }
  }

  const gender = row['Gender (male/female)'] || '';
  if (gender && !GENDERS.includes(gender)) errors.push('Invalid gender');

  const marital = row['Marital Status (single/married/divorced/widowed)'] || '';
  if (marital && !MARITAL.includes(marital)) errors.push('Invalid marital status');

  const contract = row['Contract Type (permanent/fixed_term/part_time/probationary)'] || '';
  if (contract && !CONTRACT_TYPES.includes(contract as ContractType)) errors.push('Invalid contract type');

  const status = row['Status (active/inactive/terminated/suspended)'] || '';
  if (status && !STATUSES.includes(status as EmployeeStatus)) errors.push('Invalid status');

  return {
    rowNumber,
    data: {
      fullName,
      fullNameAr: row['Full Name (AR)'] || '',
      email,
      phone: row.Phone || '',
      nationalId: row['National ID / Iqama'] || '',
      nationality: row.Nationality || 'Saudi',
      gender: gender || 'male',
      maritalStatus: marital || 'single',
      dateOfBirth: isoDate(row['Date of Birth (YYYY-MM-DD)']) || '1990-01-01',
      department: row.Department || 'General',
      position: row.Position || 'Staff',
      hireDate: isoDate(row['Hire Date (YYYY-MM-DD)']) || new Date().toISOString().slice(0, 10),
      contractType: contract || 'permanent',
      contractEndDate: isoDate(row['Contract End Date (YYYY-MM-DD)']) || undefined,
      basicSalary: toNumber(row['Basic Salary']),
      housingAllowance: toNumber(row['Housing Allowance']),
      transportationAllowance: toNumber(row['Transportation Allowance']),
      otherAllowances: toNumber(row['Other Allowances']),
      status: status || 'active',
      sponsorName: row['Sponsor Name'] || undefined,
      sponsorId: row['Sponsor ID'] || undefined,
      annualVacationDays: toNumber(row['Annual Vacation Days']) || undefined,
      vacationBalance: toNumber(row['Vacation Balance (days)']) || undefined,
      managerId: row['Manager Employee ID'] || undefined,
    },
    valid: errors.length === 0,
    errors,
  };
}