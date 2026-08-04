import { NextResponse } from 'next/server';
import { getAllLeaves, createLeaveRequest, updateLeaveStatus } from '@/modules/leave-management/service';
import { deleteLeave } from '@/lib/mock-data';
import { LeaveRequest, LeaveStatus } from '@/types';

export async function GET() {
  const data = getAllLeaves();
  return NextResponse.json({ data, total: data.length });
}

export async function POST(req: Request) {
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

  const leave = createLeaveRequest({
    employeeId: String(body.employeeId),
    companyId: 'demo-company',
    type: String(body.type) as LeaveRequest['type'],
    startDate: String(body.startDate),
    endDate: String(body.endDate),
    reason: String(body.reason || ''),
    attachments: [],
  });

  return NextResponse.json(leave, { status: 201 });
}

export async function PUT(req: Request) {
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

  const leave = updateLeaveStatus(body.id, body.status);
  if (!leave) {
    return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
  }

  if ((body.status === 'approved' || body.status === 'rejected') && body.approvedBy) {
    leave.approvedBy = body.approvedBy;
    leave.approvedAt = new Date().toISOString();
  }

  return NextResponse.json(leave);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const removed = deleteLeave(id);
  if (!removed) {
    return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
