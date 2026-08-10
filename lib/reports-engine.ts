import { employees, leaves, attendanceRecords, expenses, payrolls } from '@/lib/mock-data';

export function getDashboardStats() {
  const empList = Array.from(employees.values());
  const leaveList = Array.from(leaves.values());

  const activeEmployees = empList.filter((e) => e.status === 'active').length;
  const pendingLeaves = leaveList.filter((l) => l.status === 'pending').length;
  const totalPayroll = empList.reduce(
    (sum, e) => sum + e.salary.basic + e.salary.housing + e.salary.transportation + e.salary.otherAllowances,
    0
  );
  const avgSalary = empList.length > 0 ? Math.round(totalPayroll / empList.length) : 0;

  const departments: Record<string, number> = {};
  empList.forEach((e) => {
    departments[e.department] = (departments[e.department] || 0) + 1;
  });

  const contractTypes: Record<string, number> = {};
  empList.forEach((e) => {
    contractTypes[e.contractType] = (contractTypes[e.contractType] || 0) + 1;
  });

  const statusCounts = {
    active: activeEmployees,
    inactive: empList.filter((e) => e.status === 'inactive').length,
    terminated: empList.filter((e) => e.status === 'terminated').length,
  };

  const nationalities: Record<string, number> = {};
  empList.forEach((e) => {
    const key = e.nationality && e.nationality.trim() ? e.nationality.trim() : 'Other';
    nationalities[key] = (nationalities[key] || 0) + 1;
  });

  const sponsors: Record<string, number> = {};
  empList.forEach((e) => {
    const key = e.sponsorName && e.sponsorName.trim() ? e.sponsorName.trim() : e.contractType === 'fixed_term' ? 'Third-party' : 'Self-sponsored';
    sponsors[key] = (sponsors[key] || 0) + 1;
  });

  const genderCounts = {
    male: empList.filter((e) => e.gender === 'male').length,
    female: empList.filter((e) => e.gender === 'female').length,
  };

  return {
    totalEmployees: empList.length,
    activeEmployees,
    pendingLeaves,
    totalPayroll,
    avgSalary,
    departmentDistribution: Object.entries(departments).map(([name, count]) => ({ name, count })),
    contractDistribution: Object.entries(contractTypes).map(([name, count]) => ({ name, count })),
    statusDistribution: Object.entries(statusCounts).map(([name, count]) => ({ name, count })),
    nationalityDistribution: Object.entries(nationalities).map(([name, count]) => ({ name, count })),
    sponsorDistribution: Object.entries(sponsors).map(([name, count]) => ({ name, count })),
    genderDistribution: Object.entries(genderCounts).map(([name, count]) => ({ name, count })),
    leaveStatus: [
      { name: 'approved', count: leaveList.filter((l) => l.status === 'approved').length },
      { name: 'pending', count: pendingLeaves },
      { name: 'rejected', count: leaveList.filter((l) => l.status === 'rejected').length },
    ],
    attendanceTrend: buildAttendanceTrend(),
    attendanceToday: buildAttendanceToday(),
    payrollByPeriod: buildPayrollByPeriod(),
    expenseByCategory: buildExpenseByCategory(),
    leaveBalances: buildLeaveBalances(),
  };
}

function buildAttendanceTrend(): { date: string; present: number; late: number; absent: number; halfDay: number }[] {
  const days: { date: string; present: number; late: number; absent: number; halfDay: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const dayRecords = Array.from(attendanceRecords.values()).filter((r) => r.date === key);
    days.push({
      date: key,
      present: dayRecords.filter((r) => r.status === 'present').length,
      late: dayRecords.filter((r) => r.status === 'late').length,
      absent: dayRecords.filter((r) => r.status === 'absent').length,
      halfDay: dayRecords.filter((r) => r.status === 'half_day').length,
    });
  }
  return days;
}

function buildAttendanceToday() {
  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = Array.from(attendanceRecords.values()).filter((r) => r.date === today);
  const present: { id: string; fullName: string; fullNameAr: string; status: string; clockIn: string }[] = [];
  for (const r of todayRecords) {
    const emp = employees.get(r.employeeId);
    if (!emp) continue;
    present.push({
      id: r.id,
      fullName: emp.fullName,
      fullNameAr: emp.fullNameAr || emp.fullName,
      status: r.status,
      clockIn: r.clockIn,
    });
  }
  const counts: Record<string, number> = {};
  todayRecords.forEach((r) => {
    counts[r.status] = (counts[r.status] || 0) + 1;
  });
  return { present: present, counts, total: todayRecords.length };
}

function buildPayrollByPeriod() {
  const byPeriod: Record<string, { records: number; netPay: number; gosi: number }> = {};
  for (const p of Array.from(payrolls.values())) {
    const entry = byPeriod[p.period] || { records: 0, netPay: 0, gosi: 0 };
    entry.records += 1;
    entry.netPay += p.netPay;
    entry.gosi += p.gosiContribution;
    byPeriod[p.period] = entry;
  }
  return Object.entries(byPeriod)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([period, v]) => ({ period, ...v }));
}

function buildExpenseByCategory() {
  const cats: Record<string, { total: number; count: number }> = {};
  for (const e of Array.from(expenses.values())) {
    if (e.status === 'rejected') continue;
    const entry = cats[e.category] || { total: 0, count: 0 };
    entry.total += e.amount;
    entry.count += 1;
    cats[e.category] = entry;
  }
  return Object.entries(cats).map(([category, v]) => ({ category, ...v })).sort((a, b) => b.total - a.total);
}

function buildLeaveBalances() {
  return Array.from(employees.values())
    .filter((e) => e.status === 'active')
    .map((e) => ({
      id: e.id,
      fullName: e.fullName,
      fullNameAr: e.fullNameAr,
      vacationBalance: e.vacationBalance ?? 0,
      annualVacationDays: e.annualVacationDays ?? 30,
      usedThisYear: Math.max(0, (e.annualVacationDays ?? 30) - (e.vacationBalance ?? 0)),
      department: e.department,
    }));
}
