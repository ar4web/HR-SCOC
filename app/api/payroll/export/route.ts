import { NextResponse } from 'next/server';
import { buildPayrollExport } from '@/lib/excel';
import { getPayrolls } from '@/lib/payroll-engine';
import { employees } from '@/lib/mock-data';
import { authFromRequest, hasPermission } from '@/lib/rbac';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'payroll:view')) {
    return NextResponse.json({ error: 'Forbidden: requires payroll:view' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period');

  let list = getPayrolls().map((p) => {
    const emp = employees.get(p.employeeId);
    return {
      ...p,
      employeeName: emp?.fullName || p.employeeName,
      employeeDisplayId: emp?.employeeId || p.employeeDisplayId,
    };
  });
  if (period) list = list.filter((p) => p.period === period);

  if (!hasPermission(auth.role, 'payroll:manage')) {
    const own = employees.get(auth.employeeId || '') || Array.from(employees.values()).find((e) => e.userId === auth.sub);
    list = own ? list.filter((p) => p.employeeId === own.id) : [];
  }

  const buffer = buildPayrollExport(list);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="payroll-${period || 'all'}.xlsx"`,
    },
  });
}