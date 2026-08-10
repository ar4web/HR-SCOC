import { api } from '@/lib/api';
import { DashboardData } from '@/lib/dashboard-engine';

export const dashboardService = {
  get: () => api.get<DashboardData>('/dashboard'),
};