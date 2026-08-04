import { employees, leaves } from '@/lib/mock-data';

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

  return {
    totalEmployees: empList.length,
    activeEmployees,
    pendingLeaves,
    totalPayroll,
    avgSalary,
    departmentDistribution: Object.entries(departments).map(([name, count]) => ({ name, count })),
    contractDistribution: Object.entries(contractTypes).map(([name, count]) => ({ name, count })),
    statusDistribution: Object.entries(statusCounts).map(([name, count]) => ({ name, count })),
    leaveStatus: [
      { name: 'approved', count: leaveList.filter((l) => l.status === 'approved').length },
      { name: 'pending', count: pendingLeaves },
      { name: 'rejected', count: leaveList.filter((l) => l.status === 'rejected').length },
    ],
  };
}
