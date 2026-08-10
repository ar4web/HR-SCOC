import { NextResponse } from 'next/server';
import { generatePayslipHtml, getPayrollById } from '@/lib/payroll-engine';
import { employees } from '@/lib/mock-data';
import { authFromRequest, hasPermission } from '@/lib/rbac';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'payroll:view')) {
    return NextResponse.json({ error: 'Forbidden: payroll:view required' }, { status: 403 });
  }

  if (!hasPermission(auth.role, 'payroll:manage')) {
    const own = employees.get(auth.employeeId || '') || Array.from(employees.values()).find((e) => e.userId === auth.sub);
    const pay = getPayrollById(params.id);
    if (!own || !pay || pay.employeeId !== own.id) {
      return NextResponse.json({ error: 'Forbidden: you can only view your own payslip' }, { status: 403 });
    }
  }

  const html = generatePayslipHtml(params.id);
  if (!html) {
    return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });
  }
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
