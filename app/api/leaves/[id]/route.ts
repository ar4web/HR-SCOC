import { NextResponse } from 'next/server';
import { leaves, employees, addNotification, persistData } from '@/lib/mock-data';
import { authFromRequest, hasPermission } from '@/lib/rbac';
import { decrementAnnualBalance } from '@/lib/leave-policy-engine';
export const dynamic = 'force-dynamic';

function notifyLeave(leave: (typeof leaves extends Map<string, infer T> ? T : never), title: string, titleAr: string, message: string, messageAr: string, type: 'success' | 'error' | 'info') {
  const emp = employees.get(leave.employeeId);
  const userId = emp?.userId;
  if (!userId) return;
  addNotification({
    companyId: leave.companyId,
    userId,
    title,
    titleAr,
    message,
    messageAr,
    type,
    read: false,
    link: '/leaves',
  });
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const leave = leaves.get(params.id);
  if (!leave) {
    return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
  }
  return NextResponse.json(leave);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const leave = leaves.get(params.id);
  if (!leave) {
    return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, approvedBy } = body;

  if (action === 'approve' || action === 'reject') {
    if (!hasPermission(auth.role, 'leave:approve')) {
      return NextResponse.json({ error: 'Forbidden: managers only' }, { status: 403 });
    }

    if (action === 'approve') {
      const wasApproved = leave.status === 'approved';
      leave.status = 'approved';
      leave.approvedBy = approvedBy;
      leave.approvedAt = new Date().toISOString();
      leave.updatedAt = new Date().toISOString();
      if (leave.type === 'annual' && !wasApproved) {
        decrementAnnualBalance(leave.employeeId, leave.daysCount);
      }
      notifyLeave(leave, 'Leave Approved', 'تمت الموافقة على الإجازة', 'Your leave request has been approved', 'تمت الموافقة على طلب الإجازة الخاص بك', 'success');
      persistData();
      return NextResponse.json(leave);
    }

    if (action === 'reject') {
      leave.status = 'rejected';
      leave.approvedBy = approvedBy;
      leave.updatedAt = new Date().toISOString();
      notifyLeave(leave, 'Leave Rejected', 'تم رفض الإجازة', 'Your leave request has been rejected', 'تم رفض طلب الإجازة الخاص بك', 'error');
      persistData();
      return NextResponse.json(leave);
    }
  }

  if (action === 'cancel') {
    const wasApproved = leave.status === 'approved';
    if (!hasPermission(auth.role, 'leave:approve') && leave.employeeId !== auth.sub) {
      return NextResponse.json({ error: 'Forbidden: can only cancel your own leave' }, { status: 403 });
    }
    leave.status = 'cancelled';
    leave.updatedAt = new Date().toISOString();
    if (leave.type === 'annual' && wasApproved) {
      decrementAnnualBalance(leave.employeeId, -leave.daysCount);
    }
    notifyLeave(leave, 'Leave Cancelled', 'تم إلغاء الإجازة', 'Your leave request has been cancelled', 'تم إلغاء طلب الإجازة الخاص بك', 'info');
    persistData();
    return NextResponse.json(leave);
  }

  return NextResponse.json({ error: 'Invalid action. Use approve, reject or cancel.' }, { status: 400 });
}
