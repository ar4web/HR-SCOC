import { api } from '@/lib/api';
import { Attendance } from '@/types';

export const attendanceService = {
  list: (params?: { date?: string; employeeId?: string }) => {
    const query = new URLSearchParams();
    if (params?.date) query.set('date', params.date);
    if (params?.employeeId) query.set('employeeId', params.employeeId);
    return api.get<{ data: Attendance[]; total: number }>(`/attendance?${query.toString()}`);
  },

  clockIn: (employeeId: string, location?: { lat: number; lng: number } | null) =>
    api.post<Attendance>('/attendance', { action: 'clock-in', employeeId, location: location ?? null }),

  clockOut: (employeeId: string) =>
    api.post<Attendance>('/attendance', { action: 'clock-out', employeeId }),
};
