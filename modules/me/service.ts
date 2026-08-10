import { api } from '@/lib/api';
import { Employee } from '@/types';

export interface MeResponse {
  employee: Employee;
  user: { name: string; nameAr?: string; role: string; language?: string } | null;
  monthAttendance: { present: number; late: number; absent: number; halfDay: number; total: number; hours: number };
  attendance: { date: string; status: string; clockIn: string; clockOut: string }[];
  leaves: { id: string; type: string; startDate: string; endDate: string; daysCount: number; status: string }[];
  leaveStats: { annual: number; balance: number; used: number };
  payslips: { id: string; period: string; netPay: number; status: string }[];
  unread: number;
}

export const meService = {
  get: () => api.get<MeResponse>('/me'),
};