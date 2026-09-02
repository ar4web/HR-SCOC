import { employees, leaves, attendanceRecords, expenses, todos, documents, notifications, messages, payrolls } from '@/lib/mock-data';
import { Attendance } from '@/types';

export interface PayrollAnalyticsRow {
  period: string;
  employeeId: string;
  name: string;
  nameAr: string;
  department: string;
  nationality: string;
  isSaudi: boolean;
  basic: number;
  housing: number;
  transportation: number;
  other: number;
  /** Variable pay: overtime/bonus additions (excludes employer GOSI). */
  extras: number;
  /** Non-GOSI deductions (absence, advances…). */
  otherDeductions: number;
  /** Fixed salary components + variable pay. */
  gross: number;
  gosiEmployee: number;
  gosiEmployer: number;
  net: number;
}

export interface PayrollAnalytics {
  periods: string[];
  rows: PayrollAnalyticsRow[];
}

export function getPayrollAnalytics(): PayrollAnalytics {
  const rows: PayrollAnalyticsRow[] = [];
  for (const p of Array.from(payrolls.values())) {
    if (p.status !== 'completed') continue;
    const emp = employees.get(p.employeeId);
    const gosiEmployee = p.deductions.filter((d) => d.type === 'gosi_employee').reduce((s, d) => s + d.amount, 0);
    const gosiEmployer = p.additions.filter((a) => a.type === 'gosi_employer').reduce((s, a) => s + a.amount, 0);
    const extras = p.additions.filter((a) => a.type !== 'gosi_employer').reduce((s, a) => s + a.amount, 0);
    const otherDeductions = p.deductions.filter((d) => d.type !== 'gosi_employee').reduce((s, d) => s + d.amount, 0);
    const gross = p.salary.basic + p.salary.housing + p.salary.transportation + p.salary.otherAllowances + extras;
    rows.push({
      period: p.period,
      employeeId: p.employeeId,
      name: emp?.fullName || p.employeeId,
      nameAr: emp?.fullNameAr || emp?.fullName || p.employeeId,
      department: emp?.department || 'Other',
      nationality: emp?.nationality || 'Other',
      isSaudi: (emp?.nationality || '').toLowerCase() === 'saudi',
      basic: p.salary.basic,
      housing: p.salary.housing,
      transportation: p.salary.transportation,
      other: p.salary.otherAllowances,
      extras,
      otherDeductions,
      gross,
      gosiEmployee,
      gosiEmployer,
      net: p.netPay,
    });
  }
  const periods = Array.from(new Set(rows.map((r) => r.period))).sort();
  return { periods, rows };
}

export function getDashboardData(includePayrollAnalytics = false) {
  const empList = Array.from(employees.values());
  const leaveList = Array.from(leaves.values());
  const attList = Array.from(attendanceRecords.values());
  const expenseList = Array.from(expenses.values());
  const todoList = Array.from(todos.values());
  const docList = Array.from(documents.values());
  const notifList = Array.from(notifications.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);
  const msgList = Array.from(messages.values())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  const todayKey = new Date().toISOString().split('T')[0];
  const todayMs = new Date().setHours(0, 0, 0, 0);

  const totalPayroll = empList.reduce(
    (sum, e) => sum + e.salary.basic + e.salary.housing + e.salary.transportation + e.salary.otherAllowances,
    0
  );

  const activeEmployees = empList.filter((e) => e.status === 'active').length;
  const pendingLeaves = leaveList.filter((l) => l.status === 'pending');

  const departments: Record<string, { count: number; payroll: number }> = {};
  empList.forEach((e) => {
    const d = (departments[e.department] = departments[e.department] || { count: 0, payroll: 0 });
    d.count += 1;
    d.payroll += e.salary.basic + e.salary.housing + e.salary.transportation + e.salary.otherAllowances;
  });

  const contractTypes: Record<string, number> = {};
  empList.forEach((e) => {
    contractTypes[e.contractType] = (contractTypes[e.contractType] || 0) + 1;
  });

  const empById = (id: string) => empList.find((e) => e.id === id);

  const sponsorBy: Record<string, number> = {};
  empList.forEach((e) => {
    const key = e.sponsorName && e.sponsorName.trim() ? e.sponsorName.trim() : e.contractType === 'fixed_term' ? 'Third-party' : 'Self-sponsored';
    sponsorBy[key] = (sponsorBy[key] || 0) + 1;
  });

  const nationalityBy: Record<string, number> = {};
  empList.forEach((e) => {
    const key = e.nationality && e.nationality.trim() ? e.nationality.trim() : 'Other';
    nationalityBy[key] = (nationalityBy[key] || 0) + 1;
  });

  const runway: { employeeId: string; name: string; nameAr: string; department: string; type: string; expiryDate: string; daysLeft: number; critical: boolean }[] = [];
  empList.forEach((e) => {
    const days = (dateStr: string) => Math.round((new Date(dateStr).getTime() - todayMs) / 86400000);
    if (e.workPermitExpiry) {
      runway.push({ employeeId: e.id, name: e.fullName, nameAr: e.fullNameAr, department: e.department, type: 'work_permit', expiryDate: e.workPermitExpiry, daysLeft: days(e.workPermitExpiry), critical: days(e.workPermitExpiry) <= 90 });
    }
    if (e.iqamaNumber && e.iqamaExpiryDate) {
      runway.push({ employeeId: e.id, name: e.fullName, nameAr: e.fullNameAr, department: e.department, type: 'iqama', expiryDate: e.iqamaExpiryDate, daysLeft: days(e.iqamaExpiryDate), critical: days(e.iqamaExpiryDate) <= 90 });
    }
    if (e.contractEndDate) {
      runway.push({ employeeId: e.id, name: e.fullName, nameAr: e.fullNameAr, department: e.department, type: 'contract', expiryDate: e.contractEndDate, daysLeft: days(e.contractEndDate), critical: days(e.contractEndDate) <= 90 });
    }
    if (e.probationEndDate) {
      runway.push({ employeeId: e.id, name: e.fullName, nameAr: e.fullNameAr, department: e.department, type: 'probation', expiryDate: e.probationEndDate, daysLeft: days(e.probationEndDate), critical: days(e.probationEndDate) <= 0 });
    }
  });
  runway.sort((a, b) => a.daysLeft - b.daysLeft);

  const criticalRunway = runway.filter((r) => r.daysLeft <= 90 && r.daysLeft >= 0);

  const onLeaveNow = leaveList
    .filter((l) => l.status === 'approved' && new Date(l.startDate).getTime() <= Date.now() && new Date(l.endDate).getTime() >= todayMs)
    .map((l) => ({
      id: l.id,
      type: l.type,
      employeeName: empById(l.employeeId)?.fullName || 'Unknown',
      employeeId: l.employeeId,
      startDate: l.startDate,
      endDate: l.endDate,
      daysCount: l.daysCount,
      reason: l.reason,
    }));

  const notReturnedVacations = leaveList
    .filter(
      (l) =>
        l.status === 'approved' &&
        new Date(l.endDate).getTime() < todayMs &&
        (l.type === 'annual' || l.type === 'emergency' || l.type === 'personal' || l.type === 'hajj' || l.type === 'unpaid')
    )
    .map((l) => ({
      id: l.id,
      type: l.type,
      employeeId: l.employeeId,
      employeeName: empById(l.employeeId)?.fullName || 'Unknown',
      startDate: l.startDate,
      endDate: l.endDate,
      overdueDays: Math.max(0, Math.round((todayMs - new Date(l.endDate).getTime()) / 86400000)),
      reason: l.reason,
    }))
    .sort((a, b) => b.overdueDays - a.overdueDays);

  const attToday: Record<string, number> = {};
  attList.filter((a) => a.date === todayKey).forEach((a) => {
    attToday[a.status] = (attToday[a.status] || 0) + 1;
  });

  const trendDays: { date: string; present: number; late: number; absent: number; total: number }[] = [];
  for (let back = 6; back >= 0; back--) {
    const d = new Date();
    d.setDate(d.getDate() - back);
    const key = d.toISOString().split('T')[0];
    const dayAtt = attList.filter((a) => a.date === key);
    trendDays.push({
      date: key,
      present: dayAtt.filter((a) => a.status === 'present').length,
      late: dayAtt.filter((a) => a.status === 'late').length,
      absent: dayAtt.filter((a) => a.status === 'absent').length,
      total: dayAtt.length,
    });
  }

  const pendingExpenses = expenseList.filter((e) => e.status === 'pending');
  const pendingExpenseTotal = pendingExpenses.reduce((s, e) => s + e.amount, 0);

  const expenseByCategory = Object.entries(
    expenseList
      .filter((e) => e.status !== 'rejected')
      .reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {})
  )
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const pendingLeavesList = pendingLeaves.slice(0, 5).map((l) => {
    const e = Array.from(employees.values()).find((x) => x.id === l.employeeId);
    return {
      id: l.id,
      employeeName: e?.fullName || l.employeeId,
      employeeNameAr: e?.fullNameAr || e?.fullName || l.employeeId,
      type: l.type,
      startDate: l.startDate,
      endDate: l.endDate,
      daysCount: l.daysCount,
    };
  });
  const pendingExpensesList = pendingExpenses.slice(0, 5).map((x) => {
    const e = Array.from(employees.values()).find((emp) => emp.userId === x.requestedBy);
    return {
      id: x.id,
      category: x.category,
      amount: x.amount,
      description: x.description,
      requestedByName: e?.fullName || x.requestedBy,
    };
  });

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 30);
  const expiring = docList.filter((d) => {
    if (!d.expiryDate) return false;
    const ms = new Date(d.expiryDate).getTime();
    return ms <= deadline.getTime() && ms >= todayMs;
  });
  const expired = docList.filter((d) => d.expiryDate && new Date(d.expiryDate).getTime() < todayMs);

  const leaveTrend: { month: string; requested: number; approved: number; pending: number }[] = [];
  for (let back = 5; back >= 0; back--) {
    const d = new Date();
    d.setMonth(d.getMonth() - back);
    const label = d.toLocaleString('en', { month: 'short' });
    const y = d.getFullYear();
    const m = d.getMonth();
    const inMonth = (dateStr: string) => {
      const dd = new Date(dateStr);
      return dd.getFullYear() === y && dd.getMonth() === m;
    };
    const monthLeaves = leaveList.filter((l) => inMonth(l.createdAt));
    leaveTrend.push({
      month: `${label}`,
      requested: monthLeaves.length,
      approved: monthLeaves.filter((l) => l.status === 'approved').length,
      pending: monthLeaves.filter((l) => l.status === 'pending').length,
    });
  }

  const openTodos = todoList.filter((x) => x.status !== 'completed').length;
  const completedTodos = todoList.filter((x) => x.status === 'completed').length;
  const todoItems = todoList
    .filter((x) => x.status !== 'completed')
    .sort((a, b) => {
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return ad - bd;
    })
    .slice(0, 6)
    .map((x) => ({
      id: x.id,
      title: x.title,
      priority: x.priority,
      dueDate: x.dueDate,
      category: x.category,
    }));

  const upcomingDeadlines = [
    ...runway.map((r) => ({
      id: `${r.employeeId}-${r.type}`,
      title: r.name,
      date: r.expiryDate,
      kind: r.type === 'work_permit' ? 'work_permit' : r.type === 'iqama' ? 'iqama' : r.type === 'contract' ? 'contract' : 'probation',
    })),
    ...expiring.map((d) => ({
      id: d.id,
      title: d.name,
      date: d.expiryDate!,
      kind: 'document' as const,
    })),
  ]
    .filter((x) => new Date(x.date).getTime() >= todayMs)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 6);

  const upcomingLeaves = leaveList
    .filter((l) => (l.status === 'approved' || l.status === 'pending') && new Date(l.startDate).getTime() >= todayMs)
    .map((l) => ({
      id: l.id,
      type: l.type,
      employeeName: empById(l.employeeId)?.fullName || 'Unknown',
      employeeId: l.employeeId,
      startDate: l.startDate,
      endDate: l.endDate,
      daysCount: l.daysCount,
      status: l.status,
      reason: l.reason,
    }))
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);

  const pendingLeaveRequests = pendingLeaves
    .map((l) => ({
      id: l.id,
      type: l.type,
      employeeName: empById(l.employeeId)?.fullName || 'Unknown',
      employeeId: l.employeeId,
      startDate: l.startDate,
      endDate: l.endDate,
      daysCount: l.daysCount,
      reason: l.reason,
      requestedAt: l.createdAt,
    }))
    .slice(0, 4);

  const todayAttendance = empList.map((e) => {
    const rec = attList.find((a) => a.date === todayKey && a.employeeId === e.id);
    return {
      employeeId: e.id,
      name: e.fullName,
      department: e.department,
      status: rec?.status || ('absent' as Attendance['status']),
      clockIn: rec?.clockIn || null,
      clockOut: rec?.clockOut || null,
    };
  });

  return {
    totalEmployees: empList.length,
    activeEmployees,
    totalPayroll,
    avgSalary: empList.length ? Math.round(totalPayroll / empList.length) : 0,
    pendingLeaves: pendingLeaves.length,
    pendingLeavesList,
    departmentDistribution: Object.entries(departments).map(([name, v]) => ({ name, count: v.count, payroll: v.payroll })),
    contractDistribution: Object.entries(contractTypes).map(([name, count]) => ({ name, count })),
    sponsorDistribution: Object.entries(sponsorBy).map(([name, count]) => ({ name, count })),
    nationalityDistribution: Object.entries(nationalityBy).map(([name, count]) => ({ name, count })),
    runway,
    criticalRunway,
    onLeaveNow,
    notReturnedVacations,
    statusDistribution: [
      { name: 'active', count: activeEmployees },
      { name: 'inactive', count: empList.filter((e) => e.status === 'inactive').length },
      { name: 'terminated', count: empList.filter((e) => e.status === 'terminated').length },
    ],
    attendanceToday: {
      records: attList.filter((a) => a.date === todayKey).length,
      present: attToday['present'] || 0,
      late: attToday['late'] || 0,
      absent: attToday['absent'] || 0,
      halfDay: attToday['half_day'] || 0,
    },
    attendanceTrend: trendDays,
    leaveTrend,
    pendingExpenses: pendingExpenses.length,
    pendingExpensesList,
    pendingExpenseTotal,
    expenseByCategory,
    openTodos,
    completedTodos,
    todoItems,
    upcomingDeadlines,
    expiringDocuments: expiring.map((d) => ({
      id: d.id,
      name: d.name,
      nameAr: d.nameAr,
      category: d.category,
      expiryDate: d.expiryDate,
      remindDaysBefore: d.remindDaysBefore,
      owner: d.owner,
    })),
    expiredDocuments: expired.map((d) => ({ id: d.id, name: d.name, nameAr: d.nameAr, category: d.category, expiryDate: d.expiryDate, owner: d.owner })),
    pendingLeaveRequests,
    upcomingLeaves,
    todayAttendance,
    recentNotifications: notifList.map((n) => ({
      id: n.id,
      title: n.title,
      titleAr: n.titleAr,
      message: n.message,
      messageAr: n.messageAr,
      type: n.type,
      link: n.link,
      createdAt: n.createdAt,
      read: n.read,
    })),
    recentMessages: msgList.map((m) => ({
      id: m.id,
      senderName: m.senderName,
      content: m.content,
      attachment: m.attachment,
      timestamp: m.timestamp,
    })),
    payrollAnalytics: includePayrollAnalytics ? getPayrollAnalytics() : null,
  };
}

export type DashboardData = ReturnType<typeof getDashboardData>;