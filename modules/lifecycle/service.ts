import { api } from '@/lib/api';
import { EmployeeLifecycle, LifecycleStatus, LifecycleType, LifecycleTaskStatus } from '@/types';

export interface LifecycleSummary {
  total: number;
  inProgress: number;
  completed: number;
  overdue: number;
  cancelled: number;
}

export const lifecycleService = {
  list: (params?: { type?: LifecycleType; status?: LifecycleStatus; search?: string; employeeId?: string }) =>
    api.get<{ data: EmployeeLifecycle[]; total: number; summary: LifecycleSummary }>(
      `/lifecycle?${new URLSearchParams(
        Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== '') as [string, string][]
      )}`
    ),

  create: (data: { employeeId: string; type: LifecycleType; dueDate?: string; notes?: string }) =>
    api.post<EmployeeLifecycle>('/lifecycle', data),

  setTask: (id: string, taskId: string, taskStatus: LifecycleTaskStatus) =>
    api.put<{ success: boolean }>('/lifecycle', { id, taskId, taskStatus }),

  setStatus: (id: string, status: LifecycleStatus) =>
    api.put<{ success: boolean }>('/lifecycle', { id, status }),

  remove: (id: string) => api.delete<{ success: boolean }>(`/lifecycle?id=${id}`),
};