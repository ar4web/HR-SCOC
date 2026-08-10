import { api } from '@/lib/api';

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  pendingLeaves: number;
  totalPayroll: number;
  avgSalary: number;
  departmentDistribution: { name: string; count: number }[];
  contractDistribution: { name: string; count: number }[];
  statusDistribution: { name: string; count: number }[];
  leaveStatus: { name: string; count: number }[];
  attendanceTrend: { date: string; present: number; late: number; absent: number; halfDay: number }[];
  attendanceToday: { present: { id: string; fullName: string; fullNameAr: string; status: string; clockIn: string }[]; counts: Record<string, number>; total: number };
  payrollByPeriod: { period: string; amount: number; records: number; gosi: number }[];
  expenseByCategory: { category: string; total: number; count: number }[];
  leaveBalances: { id: string; fullName: string; fullNameAr: string; vacationBalance: number; annualVacationDays: number; usedThisYear: number; department: string }[];
}

export const reportsService = {
  getStats: () => api.get<DashboardStats>('/reports'),
};
