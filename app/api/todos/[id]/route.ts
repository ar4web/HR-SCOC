import { NextResponse } from 'next/server';
import { getTodo, updateTodo, deleteTodo } from '@/lib/todo-engine';
import { authFromRequest } from '@/lib/rbac';
export const dynamic = 'force-dynamic';

function selfId(auth: { sub: string; employeeId?: string }): string | undefined {
  return auth.employeeId || undefined;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = authFromRequest(_req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const todo = getTodo(params.id);
  if (!todo) return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  const ownId = selfId(auth);
  if (todo.ownerId && todo.ownerId !== auth.sub && todo.ownerId !== ownId && auth.role !== 'admin' && auth.role !== 'hr_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(todo);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const todo = getTodo(params.id);
  if (!todo) return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  const ownId = selfId(auth);
  if (todo.ownerId && todo.ownerId !== auth.sub && todo.ownerId !== ownId && auth.role !== 'admin' && auth.role !== 'hr_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json();
  const result = updateTodo(params.id, body);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json(result.todo);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = authFromRequest(_req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const todo = getTodo(params.id);
  if (!todo) return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  const ownId = selfId(auth);
  if (todo.ownerId && todo.ownerId !== auth.sub && todo.ownerId !== ownId && auth.role !== 'admin' && auth.role !== 'hr_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const result = deleteTodo(params.id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json({ success: true });
}