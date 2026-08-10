import { NextResponse } from 'next/server';
import { getAllLeaves, createLeaveRequest, updateLeaveStatus } from '@/modules/leave-management/service';
import { leaves, deleteLeave, employees, users, addNotification, persistData } from '@/lib/mock-data';
import { authFromRequest, hasPermission } from '@/lib/rbac';
import { validateLeaveRequest, decrementAnnualBalance } from '@/lib/leave-policy-engine';
import { LeaveRequest, LeaveStatus, LeaveType } from '@/types';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = getAllLeaves();
  return NextResponse.json({ data, total: data.length });
}

export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !body.employeeId ||
    !body.type ||
    !body.startDate ||
    !body.endDate
  ) {
    return NextResponse.json({ error: 'employeeId, type, startDate and endDate are required' }, { status: 400 });
  }

  if (body.employeeId !== auth.sub && !hasPermission(auth.role, 'leave:approve')) {
    return NextResponse.json({ error: 'Forbidden: can only create leave for yourself' }, { status: 403 });
  }

  const leave = createLeaveRequest({
    employeeId: String(body.employeeId),
    companyId: 'demo-company',
    type: String(body.type) as LeaveRequest['type'],
    startDate: String(body.startDate),
    endDate: String(body.endDate),
    reason: String(body.reason || ''),
    attachments: [],
  });

  const days = leave.daysCount || 1;
  const check = validateLeaveRequest(String(body.employeeId), String(body.type) as LeaveType, days);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 422 });
  }

  const emp = employees.get(leave.employeeId);
  const approvers = Array.from(users.values()).filter((u) => hasPermission(u.role, 'leave:approve'));
  for (const approver of approvers) {
    addNotification({
      companyId: leave.companyId,
      userId: approver.id,
      title: 'New Leave Request',
      titleAr: 'طلب إجازة جديد',
      message: `${emp?.fullName || 'An employee'} requested ${leave.type} (${leave.startDate} → ${leave.endDate})`,
      messageAr: `${emp?.fullNameAr || emp?.fullName || 'موظف'} طلب ${leave.type} (${leave.startDate} ← ${leave.endDate})`,
      type: 'info',
      read: false,
      link: '/leaves',
    });
  }

  return NextResponse.json(leave, { status: 201 });
}

export async function PUT(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'leave:approve')) {
    return NextResponse.json({ error: 'Forbidden: managers only' }, { status: 403 });
  }

  let body: { id?: string; status?: LeaveStatus; approvedBy?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.id || !body.status) {
    return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
  }

  const statuses: LeaveStatus[] = ['approved', 'rejected', 'cancelled'];
  if (!statuses.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const prev = leaves.get(body.id);
  const wasApproved = prev?.status === 'approved';

  const leave = updateLeaveStatus(body.id, body.status);
  if (!leave) {
    return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
  }
  persistData();

  if (body.status === 'approved') {
    leave.approvedBy = body.approvedBy || leave.approvedBy;
    leave.approvedAt = new Date().toISOString();
    if (leave.type === 'annual' && leave.employeeId && !wasApproved) {
      decrementAnnualBalance(leave.employeeId, leave.daysCount);
    }
  } else if (body.status === 'rejected' || body.status === 'cancelled') {
    if (leave.type === 'annual' && leave.employeeId && wasApproved) {
      decrementAnnualBalance(leave.employeeId, -leave.daysCount);
    }
  }

  const emp = employees.get(leave.employeeId);
  const userId = emp?.userId;
  if (userId) {
    const isApproved = body.status === 'approved';
    addNotification({
      companyId: leave.companyId,
      userId,
      title: isApproved ? 'Leave Approved' : 'Leave Rejected',
      titleAr: isApproved ? 'تمت الموافقة على الإجازة' : 'تم رفض الإجازة',
      message: isApproved ? 'Your leave request has been approved' : 'Your leave request has been rejected',
      messageAr: isApproved ? 'تمت الموافقة على طلب الإجازة الخاص بك' : 'تم رفض طلب الإجازة الخاص بك',
      type: isApproved ? 'success' : 'error',
      read: false,
      link: '/leaves',
    });
  }

  return NextResponse.json(leave);
}

export async function DELETE(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'leave:approve')) {
    return NextResponse.json({ error: 'Forbidden: managers only' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const removed = deleteLeave(id);
  if (!removed) {
    return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
  }
  persistData();
  return NextResponse.json({ success: true });
}
