import {
  expenses,
  expenseCategories,
  addExpense as createExpense,
  updateExpense as patchExpense,
  deleteExpense as removeExpense,
  addNotification,
} from '@/lib/mock-data';
import { Expense, ExpenseCategory, ExpenseStatus, PaymentMethod } from '@/types';

export type { Expense, ExpenseCategory, ExpenseStatus, PaymentMethod };

export function getExpenses(filters?: { status?: string; category?: string; dateFrom?: string; dateTo?: string; search?: string }): Expense[] {
  let data = Array.from(expenses.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  if (filters?.status) data = data.filter((e) => e.status === filters.status);
  if (filters?.category) data = data.filter((e) => e.category === filters.category);
  if (filters?.dateFrom) data = data.filter((e) => e.date >= (filters.dateFrom as string));
  if (filters?.dateTo) data = data.filter((e) => e.date <= (filters.dateTo as string));
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    data = data.filter(
      (e) =>
        e.category.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        (e.vendor || '').toLowerCase().includes(q)
    );
  }
  return data;
}

export function getExpense(id: string): Expense | null {
  return expenses.get(id) || null;
}

export function getExpenseCategories(): ExpenseCategory[] {
  return expenseCategories;
}

export function getExpenseSuggestions(prefix?: string, locale: 'en' | 'ar' = 'en'): string[] {
  let cats = expenseCategories.map((c) => (locale === 'ar' ? c.nameAr : c.name));
  if (prefix) {
    const q = prefix.toLowerCase();
    cats = cats.filter((c) => c.toLowerCase().includes(q));
  }
  return cats;
}

export function getExpenseSummary(source?: Expense[]): {
  total: number;
  pending: number;
  approved: number;
  reimbursed: number;
  totalAmount: number;
  pendingAmount: number;
} {
  const all = source || Array.from(expenses.values());
  return {
    total: all.length,
    pending: all.filter((e) => e.status === 'pending').length,
    approved: all.filter((e) => e.status === 'approved').length,
    reimbursed: all.filter((e) => e.status === 'reimbursed').length,
    totalAmount: all.reduce((s, e) => s + e.amount, 0),
    pendingAmount: all.filter((e) => e.status === 'pending').reduce((s, e) => s + e.amount, 0),
  };
}

export function addExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Expense {
  return createExpense(data);
}

export function updateExpense(id: string, patch: Partial<Expense>): { success: boolean; expense?: Expense; error?: string } {
  const expense = patchExpense(id, patch);
  if (!expense) return { success: false, error: 'Expense not found' };
  return { success: true, expense };
}

export function requestReimbursement(id: string): { success: boolean; expense?: Expense; error?: string } {
  const expense = expenses.get(id);
  if (!expense) return { success: false, error: 'Expense not found' };
  if (expense.status === 'pending') {
    expense.status = 'pending';
    addNotification({
      companyId: 'demo-company',
      userId: 'user-1',
      title: 'Reimbursement Requested',
      titleAr: 'تم طلب الاسترداد',
      message: `Reimbursement requested for ${expense.amount} ﷼ (${expense.category})`,
      messageAr: `تم طلب استرداد مبلغ ${expense.amount} ريال (${expense.category})`,
      type: 'info',
      read: false,
      link: '/expenses',
    });
  }
  return { success: true, expense };
}

export function updateExpenseStatus(id: string, status: ExpenseStatus): { success: boolean; expense?: Expense; error?: string } {
  const expense = expenses.get(id);
  if (!expense) return { success: false, error: 'Expense not found' };
  expense.status = status;
  if (status === 'reimbursed') {
    expense.reimbursedAt = new Date().toISOString().split('T')[0];
    addNotification({
      companyId: 'demo-company',
      userId: 'user-1',
      title: 'Expense Reimbursed',
      titleAr: 'تم استرداد المصروف',
      message: `Your expense of ${expense.amount} ﷼ (${expense.category}) was reimbursed`,
      messageAr: `تم استرداد مصروفك البالغ ${expense.amount} ريال (${expense.category})`,
      type: 'success',
      read: false,
      link: '/expenses',
    });
  }
  return { success: true, expense };
}

export function deleteExpense(id: string): { success: boolean; error?: string } {
  return removeExpense(id) ? { success: true } : { success: false, error: 'Expense not found' };
}

export function createCustomCategory(name: string, nameAr: string): ExpenseCategory {
  const cat: ExpenseCategory = {
    id: `ec-custom-${Date.now()}`,
    name,
    nameAr: nameAr || name,
  };
  expenseCategories.push(cat);
  return cat;
}