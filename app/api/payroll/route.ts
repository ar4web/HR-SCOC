import { NextResponse } from 'next/server';
import { getPayrolls, processPayroll } from '@/lib/payroll-engine';
import { employees } from '@/lib/mock-data';
import { authFromRequest, hasPermission } from '@/lib/rbac';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'payroll:view')) {
    return NextResponse.json({ error: 'Forbidden: payroll:view required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period');
  let employeeId = searchParams.get('employeeId');

  if (!hasPermission(auth.role, 'payroll:manage')) {
    const own = employees.get(auth.employeeId || '') || Array.from(employees.values()).find((e) => e.userId === auth.sub);
    employeeId = own?.id || '__none__';
  }

  let list = getPayrolls()
    .map((p) => {
      const emp = employees.get(p.employeeId);
      return {
        ...p,
        employeeName: emp?.fullName,
        employeeDisplayId: emp?.employeeId,
      };
    });
  if (period) list = list.filter((p) => p.period === period);
  if (employeeId) list = list.filter((p) => p.employeeId === employeeId);
  list.sort((a, b) => new Date(b.processedAt || '').getTime() - new Date(a.processedAt || '').getTime());

  return NextResponse.json({ data: list, total: list.length });
}

export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'payroll:manage')) {
    return NextResponse.json({ error: 'Forbidden: Requires payroll:manage' }, { status: 403 });
  }

  const { period } = await req.json();
  if (!period) {
    return NextResponse.json({ error: 'Period is required (e.g. 2024-01)' }, { status: 400 });
  }

  const result = processPayroll(period);
  return NextResponse.json(result);
}
