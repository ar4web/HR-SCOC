import { NextResponse } from 'next/server';
import { employees } from '@/lib/mock-data';

export async function GET() {
  const empList = Array.from(employees.values())
    .filter((e) => e.status === 'active')
    .map((e) => ({
      id: e.id,
      employeeId: e.employeeId,
      fullName: e.fullName,
      fullNameAr: e.fullNameAr,
      department: e.department,
      salary: e.salary,
    }));

  return NextResponse.json({ data: empList, total: empList.length });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { employeeId, salary } = body;

  const emp = Array.from(employees.values()).find((e) => e.id === employeeId);
  if (!emp) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  const basic = Number(salary.basic) || 0;
  const housing = Number(salary.housing) || 0;
  const transportation = Number(salary.transportation) || 0;
  const otherAllowances = Number(salary.otherAllowances) || 0;

  emp.salary = {
    basic,
    housing,
    transportation,
    otherAllowances,
    total: basic + housing + transportation + otherAllowances,
    bankName: salary.bankName || emp.salary.bankName,
    bankAccount: salary.bankAccount || emp.salary.bankAccount,
    iban: salary.iban || emp.salary.iban,
  };
  emp.updatedAt = new Date().toISOString();

  return NextResponse.json({ data: emp.salary });
}
