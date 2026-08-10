import { NextResponse } from 'next/server';
import { getAllEmployees, createEmployee } from '@/modules/employee-management/service';

import { authFromRequest, hasPermission } from '@/lib/rbac';
import { employees } from '@/lib/mock-data';
import { parseWith, employeeCreateSchema } from '@/lib/validation';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const department = searchParams.get('department');

const auth = authFromRequest(req);
  const isViewHR = !!auth && hasPermission(auth.role, 'employee:view_all');

  let data = getAllEmployees();

  // Scope access: employee sees only self, manager sees their department team.
  if (auth?.role === 'employee') {
    const empId = auth.employeeId;
    data = data.filter((e) => e.id === empId);
  } else if (auth?.role === 'manager' && !isViewHR) {
    const myEmp = employees.get(auth.employeeId || '');
    const myDept = myEmp?.department;
    data = data.filter(
      (e) => e.department === myDept || e.managerId === auth.employeeId
    );
  }

  if (status) data = data.filter((e) => e.status === status);
  if (department) data = data.filter((e) => e.department === department);
  if (search) {
    const q = search.toLowerCase();
    data = data.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.fullNameAr.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ data, total: data.length });
}

export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'employee:manage')) {
    return NextResponse.json({ error: 'Forbidden: HR/managers only' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || !body.fullName || !body.email) {
    return NextResponse.json({ error: 'fullName and email are required' }, { status: 400 });
  }

  const parsed = parseWith(employeeCreateSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const employee = createEmployee({
    ...(parsed.data as object),
    companyId: auth.companyId || 'demo-company',
  } as Parameters<typeof createEmployee>[0]);

  return NextResponse.json(employee, { status: 201 });
}