import { NextResponse } from 'next/server';
import { getAttendance, clockIn, clockOut } from '@/lib/attendance-engine';
import { employees } from '@/lib/mock-data';
import { authFromRequest } from '@/lib/rbac';
export const dynamic = 'force-dynamic';

function resolveSelfId(auth: { sub: string; employeeId?: string }): string | undefined {
  return (
    (auth.employeeId && employees.get(auth.employeeId)?.id) ||
    Array.from(employees.values()).find((e) => e.userId === auth.sub)?.id
  );
}

export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const requested = searchParams.get('employeeId');

  let data = getAttendance(date || undefined);

  if (auth.role === 'admin' || auth.role === 'hr_manager') {
    if (requested) data = data.filter((r) => r.employeeId === requested);
  } else if (auth.role === 'manager') {
    const myEmp =
      (auth.employeeId && employees.get(auth.employeeId)) ||
      Array.from(employees.values()).find((e) => e.userId === auth.sub);
    const myDept = myEmp?.department;
    data = data.filter((r) => {
      const emp = employees.get(r.employeeId);
      return emp?.department === myDept || emp?.managerId === auth.employeeId;
    });
  } else {
    const ownId = resolveSelfId(auth);
    if (!ownId) {
      return NextResponse.json({ error: 'No employee record linked' }, { status: 404 });
    }
    data = data.filter((r) => r.employeeId === ownId);
  }

  return NextResponse.json({ data, total: data.length });
}

export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const employeeId = body.employeeId as string | undefined;

  if (!employeeId) {
    return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
  }

  if (auth.role === 'employee') {
    const ownId = resolveSelfId(auth);
    if (!ownId || ownId !== employeeId) {
      return NextResponse.json({ error: 'Forbidden: can only clock for yourself' }, { status: 403 });
    }
  }

  if (body.action === 'clock-in') {
    const result = clockIn(employeeId, body.location || null);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.record);
  }

  if (body.action === 'clock-out') {
    const result = clockOut(employeeId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.record);
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}