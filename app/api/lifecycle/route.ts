import { NextResponse } from 'next/server';
import { employees } from '@/lib/mock-data';
import { authFromRequest } from '@/lib/rbac';
import { createLifecycle, listLifecycles, setTaskStatus, setLifecycleStatus, removeLifecycleById, getLifecycleSummary, notifyLifecycleUser, authCanManage } from '@/lib/lifecycle-engine';
import { LifecycleType, LifecycleStatus, LifecycleTaskStatus } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') as LifecycleType | null;
  const status = searchParams.get('status') as LifecycleStatus | null;
  const search = searchParams.get('search') || undefined;

  const isManager = authCanManage(auth.role);
  let employeeId: string | undefined;
  if (!isManager) {
    const self = auth.employeeId
      ? employees.get(auth.employeeId)
      : Array.from(employees.values()).find((e) => e.userId === auth.sub);
    if (!self) {
      return NextResponse.json({ data: [], total: 0 });
    }
    employeeId = self.id;
  } else if (searchParams.get('employeeId')) {
    employeeId = searchParams.get('employeeId') || undefined;
  }

  const data = listLifecycles({
    type: type || undefined,
    status: status || undefined,
    search,
    ...(employeeId ? { employeeId } : {}),
  });

  return NextResponse.json({ data, total: data.length, summary: getLifecycleSummary() });
}

export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!authCanManage(auth.role)) {
    return NextResponse.json({ error: 'Forbidden: HR staff only' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.employeeId || !body.type) {
    return NextResponse.json({ error: 'employeeId and type are required' }, { status: 400 });
  }
  if (body.type !== 'onboarding' && body.type !== 'offboarding') {
    return NextResponse.json({ error: 'Invalid type; use onboarding or offboarding' }, { status: 400 });
  }

  const result = createLifecycle({
    employeeId: String(body.employeeId),
    type: String(body.type) as LifecycleType,
    dueDate: body.dueDate ? String(body.dueDate) : undefined,
    notes: body.notes ? String(body.notes) : undefined,
    createdBy: auth.sub,
  });

  if (!result.success || !result.lifecycle) {
    return NextResponse.json({ error: result.error || 'Failed to create lifecycle' }, { status: 400 });
  }
  notifyLifecycleUser(result.lifecycle);
  return NextResponse.json(result.lifecycle, { status: 201 });
}

export async function PUT(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const isManager = authCanManage(auth.role);

  if (body.taskId && body.taskStatus) {
    const allowedStatuses: LifecycleTaskStatus[] = ['pending', 'done'];
    if (!allowedStatuses.includes(body.taskStatus)) {
      return NextResponse.json({ error: 'Invalid task status' }, { status: 400 });
    }
    const result = setTaskStatus(String(body.id), String(body.taskId), String(body.taskStatus) as LifecycleTaskStatus);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  }

  if (body.status) {
    const statuses: LifecycleStatus[] = ['draft', 'in_progress', 'completed', 'cancelled'];
    if (!statuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid lifecycle status' }, { status: 400 });
    }
    if (!isManager) {
      return NextResponse.json({ error: 'Forbidden: HR staff only' }, { status: 403 });
    }
    const result = setLifecycleStatus(String(body.id), String(body.status) as LifecycleStatus);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'taskId/taskStatus or status required' }, { status: 400 });
}

export async function DELETE(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!authCanManage(auth.role)) {
    return NextResponse.json({ error: 'Forbidden: HR staff only' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }
  return removeLifecycleById(id)
    ? NextResponse.json({ success: true })
    : NextResponse.json({ error: 'Lifecycle not found' }, { status: 404 });
}