import { NextResponse } from 'next/server';
import { buildEmployeesExport } from '@/lib/excel';
import { employees } from '@/lib/mock-data';
import { authFromRequest, hasPermission } from '@/lib/rbac';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'employee:manage')) {
    return NextResponse.json({ error: 'Forbidden: requires employee:manage' }, { status: 403 });
  }

  const list = Array.from(employees.values()).map((e) => ({
    employeeId: e.employeeId,
    fullName: e.fullName,
    fullNameAr: e.fullNameAr,
    email: e.email,
    nationality: e.nationality,
    gender: e.gender,
    department: e.department,
    position: e.position,
    contractType: e.contractType,
    hireDate: e.hireDate,
    basic: e.salary.basic,
    housing: e.salary.housing,
    transportation: e.salary.transportation,
    otherAllowances: e.salary.otherAllowances,
    total: e.salary.total,
    bankName: e.salary.bankName,
    iban: e.salary.iban,
  }));

  const buffer = buildEmployeesExport(list);
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="employees-${date}.xlsx"`,
    },
  });
}