import { NextResponse } from 'next/server';
import { getExpenses, addExpense, getExpenseSummary, getExpenseSuggestions, getExpenseCategories } from '@/lib/expense-engine';
import { authFromRequest } from '@/lib/rbac';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'list';

  if (type === 'summary') {
    if (auth?.role === 'employee') {
      const own = getExpenses().filter((e) => e.requestedBy === auth.sub);
      return NextResponse.json(getExpenseSummary(own));
    }
    return NextResponse.json(getExpenseSummary());
  }

  if (type === 'suggestions') {
    const q = searchParams.get('q') || undefined;
    const locale = searchParams.get('locale') || 'en';
    return NextResponse.json({ data: getExpenseSuggestions(q, locale as 'en' | 'ar') });
  }

  if (type === 'categories') {
    return NextResponse.json({ data: getExpenseCategories() });
  }

  const filters = {
    status: searchParams.get('status') || undefined,
    category: searchParams.get('category') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    search: searchParams.get('search') || undefined,
  };
  let data = getExpenses(filters);
  if (auth?.role === 'employee') {
    data = data.filter((e) => e.requestedBy === auth.sub);
  }
  return NextResponse.json({ data, total: data.length });
}

export async function POST(req: Request) {
  const auth = authFromRequest(req);
  const body = await req.json();
  if (!body || body.amount === undefined || !body.category) {
    return NextResponse.json({ error: 'amount and category are required' }, { status: 400 });
  }
  const expense = addExpense({ ...body, status: 'pending', paymentMethod: 'cash', requestedBy: auth?.sub || 'user-1' });
  return NextResponse.json(expense, { status: 201 });
}