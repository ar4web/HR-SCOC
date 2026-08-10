import { NextResponse } from 'next/server';
import { getTodos, addTodo } from '@/lib/todo-engine';
import { authFromRequest } from '@/lib/rbac';
import { employees } from '@/lib/mock-data';
export const dynamic = 'force-dynamic';

function selfId(auth: { sub: string; employeeId?: string }): string | undefined {
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
  const filters = {
    status: searchParams.get('status') || undefined,
    priority: searchParams.get('priority') || undefined,
    search: searchParams.get('search') || undefined,
  };
  let data = getTodos(filters);
  if (auth.role === 'employee') {
    const ownId = selfId(auth);
    data = data.filter((t) => !t.ownerId || t.ownerId === auth.sub || (ownId && t.ownerId === ownId));
  }
  return NextResponse.json({ data, total: data.length });
}

export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  if (!body || !body.title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  const todo = addTodo({ status: 'pending', priority: 'medium', ownerId: body.ownerId || auth.sub, ...body });
  return NextResponse.json(todo, { status: 201 });
}