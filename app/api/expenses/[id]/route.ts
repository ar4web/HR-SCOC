import { NextResponse } from 'next/server';
import { getExpense, updateExpense, deleteExpense, updateExpenseStatus, requestReimbursement } from '@/lib/expense-engine';
import { authFromRequest, hasPermission } from '@/lib/rbac';
import { addNotification } from '@/lib/mock-data';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = authFromRequest(_req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const expense = getExpense(params.id);
  if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  if (expense.requestedBy !== auth.sub && !hasPermission(auth.role, 'expense:approve')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(expense);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);

  if (body?.action === 'reimburse') {
    if (!hasPermission(auth.role, 'expense:approve')) {
      return NextResponse.json({ error: 'Forbidden: Requires expense:approve' }, { status: 403 });
    }
    const result = requestReimbursement(params.id);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 404 });
    return NextResponse.json(result.expense);
  }

  if (body?.action === 'status') {
    if (!hasPermission(auth.role, 'expense:approve')) {
      return NextResponse.json({ error: 'Forbidden: Requires expense:approve' }, { status: 403 });
    }
    const result = updateExpenseStatus(params.id, body.status);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 404 });

    const expense = result.expense;
    if (expense) {
      const approved = body.status === 'approved';
      const rejected = body.status === 'rejected';
      if (approved || rejected) {
        addNotification({
          companyId: 'demo-company',
          userId: expense.requestedBy,
          title: approved ? 'Expense Approved' : 'Expense Rejected',
          titleAr: approved ? 'تمت الموافقة على المصروف' : 'تم رفض المصروف',
          message: approved ? 'Your expense request has been approved' : 'Your expense request has been rejected',
          messageAr: approved ? 'تمت الموافقة على طلب المصروف الخاص بك' : 'تم رفض طلب المصروف الخاص بك',
          type: approved ? 'success' : 'error',
          read: false,
          link: '/expenses',
        });
      }
    }
    return NextResponse.json(result.expense);
  }

  if (!hasPermission(auth.role, 'expense:manage')) {
    return NextResponse.json({ error: 'Forbidden: Requires expense:manage' }, { status: 403 });
  }

  const patch = { ...body };
  delete patch.action;
  const result = updateExpense(params.id, patch);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json(result.expense);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = authFromRequest(_req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(auth.role, 'expense:manage')) {
    return NextResponse.json({ error: 'Forbidden: Requires expense:manage' }, { status: 403 });
  }
  const result = deleteExpense(params.id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json({ success: true });
}