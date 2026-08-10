import { api } from '@/lib/api';
import { Expense, ExpenseCategory, ExpenseStatus } from '@/types';

export interface ExpenseFilters {
  status?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface ExpenseSummary {
  total: number;
  pending: number;
  approved: number;
  reimbursed: number;
  totalAmount: number;
  pendingAmount: number;
}

export const expenseService = {
  getExpenses: (filters?: ExpenseFilters) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.category) params.set('category', filters.category);
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    if (filters?.search) params.set('search', filters.search);
    return api.get<{ data: Expense[]; total: number }>(`/expenses${params.toString() ? `?${params.toString()}` : ''}`);
  },

  getSummary: () => api.get<ExpenseSummary>('/expenses?type=summary'),

  getCategories: () => api.get<{ data: ExpenseCategory[] }>('/expenses?type=categories'),

  getSuggestions: (q: string, locale: 'en' | 'ar' = 'en') =>
    api.get<{ data: string[] }>(`/expenses?type=suggestions&q=${encodeURIComponent(q)}&locale=${locale}`),

  getExpense: (id: string) => api.get<Expense>(`/expenses/${id}`),

  createExpense: (data: Partial<Expense>) => api.post<Expense>('/expenses', data),

  updateExpense: (id: string, patch: Partial<Expense>) =>
    api.put<Expense>(`/expenses/${id}`, { ...patch }),

  updateStatus: (id: string, status: ExpenseStatus) =>
    api.put<Expense>(`/expenses/${id}`, { action: 'status', status }),

  requestReimbursement: (id: string) =>
    api.put<Expense>(`/expenses/${id}`, { action: 'reimburse' }),

  deleteExpense: (id: string) => api.delete<{ success: boolean }>(`/expenses/${id}`),
};