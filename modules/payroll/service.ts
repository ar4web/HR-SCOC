import { api } from '@/lib/api';
import { Payroll } from '@/types';
import { TimesheetOptions, TimesheetPreview } from '@/lib/timesheet';

export interface SalaryUpdate {
  basic: number;
  housing: number;
  transportation: number;
  otherAllowances: number;
  total: number;
  bankName: string;
  bankAccount: string;
  iban: string;
}

export interface TimesheetUploadResult extends TimesheetPreview {
  period: string;
  options: TimesheetOptions;
}

export const payrollService = {
  list: (params?: { period?: string; employeeId?: string }) => {
    const query = new URLSearchParams();
    if (params?.period) query.set('period', params.period);
    if (params?.employeeId) query.set('employeeId', params.employeeId);
    return api.get<{ data: Payroll[]; total: number }>(`/payroll?${query.toString()}`);
  },

  process: (period: string) =>
    api.post<{ success: boolean; count: number; errors: string[] }>('/payroll', { period }),

  getTimesheetTemplateUrl: () => '/api/payroll/timesheet/template',

  uploadTimesheet: (file: File, period: string, options: TimesheetOptions) => {
    const form = new FormData();
    form.set('file', file);
    form.set('period', period);
    form.set('otMultiplier', String(options.otMultiplier));
    form.set('dailyRateMode', options.dailyRateMode);
    if (options.customDailyRate) form.set('customDailyRate', String(options.customDailyRate));
    if (options.customOtRate) form.set('customOtRate', String(options.customOtRate));
    return api.post<TimesheetUploadResult>('/payroll/timesheet', form);
  },

  applyTimesheet: (
    period: string,
    options: TimesheetOptions,
    rows: { rowNumber: number; employeeId: string; date: string; clockIn: string; clockOut?: string; breakHours: number; otHours: number; dailyRateOverride?: number; otRateOverride?: number; notes?: string }[]
  ) =>
    api.post<{ success: boolean; count: number; errors: string[]; period: string }>('/payroll/timesheet/apply', {
      period,
      options,
      rows,
    }),

  getSalaries: () =>
    api.get<{ data: any[]; total: number }>('/payroll/salaries'),

  updateSalary: (employeeId: string, salary: SalaryUpdate) =>
    api.patch<SalaryUpdate>('/payroll/salaries', { employeeId, salary }),

  getWPS: (period: string) =>
    api.get<string>(`/payroll/wps?period=${period}`),

  getPayslipUrl: (payrollId: string) => `/api/payroll/payslip/${payrollId}`,
};
