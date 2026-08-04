import { api } from '@/lib/api';
import { Attendance } from '@/types';

export const attendanceService = {
  list: (params?: { date?: string; employeeId?: string }) => {
    const query = new URLSearchParams();
    if (params?.date) query.set('date', params.date);
    if (params?.employeeId) query.set('employeeId', params.employeeId);
    return api.get<{ data: Attendance[]; total: number }>(`/attendance?${query.toString()}`);
  },

  clockIn: (employeeId: string) =>
    api.post<Attendance>('/attendance', { action: 'clock-in', employeeId }),

  clockOut: (employeeId: string) =>
    api.post<Attendance>('/attendance', { action: 'clock-out', employeeId }),
};
