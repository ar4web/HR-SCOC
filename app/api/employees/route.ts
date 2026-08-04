import { NextResponse } from 'next/server';
import { getAllEmployees, createEmployee } from '@/modules/employee-management/service';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const department = searchParams.get('department');

  let data = getAllEmployees();
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
  let body: Omit<Employee, 'id' | 'employeeId' | 'createdAt' | 'updatedAt'>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || !body.fullName || !body.email) {
    return NextResponse.json({ error: 'fullName and email are required' }, { status: 400 });
  }

  const employee = createEmployee({
    ...body,
    companyId: 'demo-company',
  });

  return NextResponse.json(employee, { status: 201 });
}
