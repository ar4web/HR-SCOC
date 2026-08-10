import { NextResponse } from 'next/server';
import { employees, users, payrolls, leaves, attendanceRecords, notifications } from '@/lib/mock-data';
import { authFromRequest } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let emp = auth.employeeId ? employees.get(auth.employeeId) : undefined;
  if (!emp) {
    emp = Array.from(employees.values()).find((e) => e.userId === auth.sub);
  }

  if (!emp) {
    return NextResponse.json({ error: 'No employee record linked to your account' }, { status: 404 });
  }

  const userInfo = users.get(auth.sub);

  const myLeaves = Array.from(leaves.values())
    .filter((l) => l.employeeId === emp.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const myAttendance = Array.from(attendanceRecords.values())
    .filter((a) => a.employeeId === emp.id)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const monthPrefix = new Date().toISOString().slice(0, 7);
  const monthAttendance = myAttendance.filter((a) => a.date.startsWith(monthPrefix));

  const myPayslips = Array.from(payrolls.values())
    .filter((p) => p.employeeId === emp.id)
    .sort((a, b) => (a.period < b.period ? 1 : -1))
    .slice(0, 6);

  const myUnread = Array.from(notifications.values()).filter(
    (n) => n.userId === auth.sub && !n.read
  ).length;

  const used = Math.max(0, (emp.annualVacationDays ?? 30) - (emp.vacationBalance ?? 0));

  return NextResponse.json({
    employee: emp,
    user: userInfo
      ? { name: userInfo.name, nameAr: userInfo.nameAr, role: userInfo.role, language: userInfo.language }
      : null,
    monthAttendance: {
      present: monthAttendance.filter((a) => a.status === 'present').length,
      late: monthAttendance.filter((a) => a.status === 'late').length,
      absent: monthAttendance.filter((a) => a.status === 'absent').length,
      halfDay: monthAttendance.filter((a) => a.status === 'half_day').length,
      total: monthAttendance.length,
      hours: monthAttendance.reduce((s, a) => s + (a.hoursWorked || 0), 0),
    },
    attendance: myAttendance.slice(0, 6).map((a) => ({ date: a.date, status: a.status, clockIn: a.clockIn, clockOut: a.clockOut || '' })),
    leaves: myLeaves.slice(0, 6).map((l) => ({ id: l.id, type: l.type, startDate: l.startDate, endDate: l.endDate, daysCount: l.daysCount, status: l.status })),
    leaveStats: {
      annual: emp.annualVacationDays ?? 30,
      balance: emp.vacationBalance ?? 0,
      used,
    },
    payslips: myPayslips.map((p) => ({ id: p.id, period: p.period, netPay: p.netPay, status: p.status })),
    unread: myUnread,
  });
}