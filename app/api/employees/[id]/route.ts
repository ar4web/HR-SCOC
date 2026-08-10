import { NextResponse } from 'next/server';
import { getEmployeeById, updateEmployee } from '@/modules/employee-management/service';
import { deleteEmployee, employees } from '@/lib/mock-data';
import { authFromRequest, hasPermission } from '@/lib/rbac';
import { parseWith, employeeUpdateSchema } from '@/lib/validation';
export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

function canView(auth: {
  role?: string;
  sub: string;
  employeeId?: string;
}, target: { id: string; userId?: string; department?: string; managerId?: string } | null | undefined): boolean {
  if (!target) return true;
  if (auth.role === 'admin' || auth.role === 'hr_manager') return true;
  if (auth.employeeId && (target.id === auth.employeeId || target.userId === auth.sub)) return true;
  if (auth.role === 'manager') {
    const myEmp = employees.get(auth.employeeId || '');
    if (target.managerId === auth.employeeId) return true;
    if (myEmp?.department && target.department === myEmp.department) return true;
  }
  return false;
}

function canManage(auth: {
  role?: string;
  employeeId?: string;
}, target: { department?: string } | null | undefined): boolean {
  if (!target) return true;
  if (auth.role === 'admin' || auth.role === 'hr_manager') return true;
  if (auth.role === 'manager') {
    const myEmp = employees.get(auth.employeeId || '');
    return Boolean(myEmp?.department && target.department === myEmp.department);
  }
  return false;
}

export async function GET(_req: Request, { params }: Params) {
  const auth = authFromRequest(_req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const employee = getEmployeeById(params.id);
  if (!employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }
  if (!canView(auth, employee)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(employee);
}

export async function PUT(req: Request, { params }: Params) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(auth.role, 'employee:manage')) {
    return NextResponse.json({ error: 'Forbidden: HR/managers only' }, { status: 403 });
  }
  const target = getEmployeeById(params.id);
  if (!target) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }
  if (!canManage(auth, target)) {
    return NextResponse.json({ error: 'Forbidden: not your department' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseWith(employeeUpdateSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const employee = updateEmployee(params.id, parsed.data as Parameters<typeof updateEmployee>[1]);
  if (!employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }
  return NextResponse.json(employee);
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = authFromRequest(_req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (auth.role !== 'admin' && auth.role !== 'hr_manager') {
    return NextResponse.json({ error: 'Forbidden: HR only' }, { status: 403 });
  }
  const removed = deleteEmployee(params.id);
  if (!removed) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}