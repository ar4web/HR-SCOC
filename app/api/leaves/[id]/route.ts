import { NextResponse } from 'next/server';
import { leaves, addNotification } from '@/lib/mock-data';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const leave = leaves.get(params.id);
  if (!leave) {
    return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
  }

  const body = await req.json();
  const { action, approvedBy } = body;

  if (action === 'approve') {
    leave.status = 'approved';
    leave.approvedBy = approvedBy;
    leave.approvedAt = new Date().toISOString();
    leave.updatedAt = new Date().toISOString();
    addNotification({
      companyId: leave.companyId,
      userId: leave.employeeId,
      title: 'Leave Approved',
      titleAr: 'تمت الموافقة على الإجازة',
      message: 'Your leave request has been approved',
      messageAr: 'تمت الموافقة على طلب الإجازة الخاص بك',
      type: 'success',
      read: false,
      link: '/leaves',
    });
    return NextResponse.json(leave);
  }

  if (action === 'reject') {
    leave.status = 'rejected';
    leave.approvedBy = approvedBy;
    leave.approvedAt = new Date().toISOString();
    leave.updatedAt = new Date().toISOString();
    addNotification({
      companyId: leave.companyId,
      userId: leave.employeeId,
      title: 'Leave Rejected',
      titleAr: 'تم رفض الإجازة',
      message: 'Your leave request has been rejected',
      messageAr: 'تم رفض طلب الإجازة الخاص بك',
      type: 'error',
      read: false,
      link: '/leaves',
    });
    return NextResponse.json(leave);
  }

  return NextResponse.json({ error: 'Invalid action. Use approve or reject.' }, { status: 400 });
}
