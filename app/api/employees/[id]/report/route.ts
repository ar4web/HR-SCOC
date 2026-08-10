import { NextResponse } from 'next/server';
import { authFromRequest, hasPermission } from '@/lib/rbac';
import { employees, attendanceRecords, leaves, payrolls } from '@/lib/mock-data';
import { getPolicy } from '@/lib/leave-policy-engine';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const target = employees.get(params.id);
  if (!target) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  const me =
    (auth.employeeId && employees.get(auth.employeeId)) ||
    Array.from(employees.values()).find((e) => e.userId === auth.sub);

  const canViewAll = hasPermission(auth.role, 'employee:view_all');
  const sameDept = auth.role === 'manager' && !!me && me.department === target.department;
  const isSelf = !!me && me.id === target.id;

  if (!canViewAll && !sameDept && !isSelf) {
    return NextResponse.json({ error: 'Forbidden: cannot view this report' }, { status: 403 });
  }

  const empAttendance = Array.from(attendanceRecords.values()).filter((a) => a.employeeId === target.id);
  const now = new Date();
  const months: { label: string; present: number; late: number; absent: number; half_day: number; total: number }[] = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const rows = empAttendance.filter((a) => a.date.startsWith(prefix));
    months.push({
      label: prefix,
      present: rows.filter((r) => r.status === 'present').length,
      late: rows.filter((r) => r.status === 'late').length,
      absent: rows.filter((r) => r.status === 'absent').length,
      half_day: rows.filter((r) => r.status === 'half_day').length,
      total: rows.length,
    });
  }
  const presence = months.reduce((s, m) => s + m.present + m.late + m.half_day, 0);
  const monthsTotal = months.reduce((s, m) => s + m.total, 0);

  const year = now.getFullYear();
  const myLeaves = Array.from(leaves.values()).filter(
    (l) => l.employeeId === target.id && l.status !== 'cancelled'
  );
  const yearLeaves = myLeaves.filter(
    (l) => new Date(l.startDate).getFullYear() === year && l.status !== 'rejected'
  );
  const byType: Record<string, number> = {};
  for (const l of yearLeaves) {
    byType[l.type] = (byType[l.type] || 0) + l.daysCount;
  }
  const approvedYear = yearLeaves.filter((l) => l.status === 'approved').reduce((s, l) => s + l.daysCount, 0);

  const policy = getPolicy('annual');
  const annualAllowed = policy?.daysPerYear ?? target.annualVacationDays ?? 30;
  const remaining = Math.max(0, annualAllowed - approvedYear);

  const empPayrolls = Array.from(payrolls.values())
    .filter((p) => p.employeeId === target.id)
    .sort((a, b) => (a.period < b.period ? 1 : -1))
    .slice(0, 6);

  const latest = empPayrolls[0];
  const grossTotal = empPayrolls.reduce((s, p) => s + (p.timesheet?.grossPay ?? p.salary?.total ?? 0), 0);

  return NextResponse.json({
    employee: { id: target.id, fullName: target.fullName, fullNameAr: target.fullNameAr, department: target.department, position: target.position },
    attendanceTrend: months,
    leave: {
      annualAllowed,
      used: approvedYear,
      remaining,
      byType,
      totalRequests: myLeaves.length,
      pending: myLeaves.filter((l) => l.status === 'pending').length,
    },
    payroll: {
      count: empPayrolls.length,
      latest: latest ? { period: latest.period, net: latest.netPay ?? 0, gross: latest.timesheet?.grossPay ?? latest.salary?.total ?? 0 } : null,
      grossTotal,
      average: empPayrolls.length ? Math.round(grossTotal / empPayrolls.length) : 0,
    },
    salary: target.salary,
    attendanceRate: monthsTotal ? Math.round((presence / monthsTotal) * 100) : 0,
  });
}