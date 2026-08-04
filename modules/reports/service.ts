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
}

export const reportsService = {
  getStats: () => api.get<DashboardStats>('/reports'),
};
