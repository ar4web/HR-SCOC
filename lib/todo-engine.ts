import { todos, addTodo as createTodo, updateTodo as patchTodo, deleteTodo as removeTodo, addNotification } from '@/lib/mock-data';
import { Todo } from '@/types';

export type { Todo };

export function getTodos(filters?: { status?: string; priority?: string; search?: string }): Todo[] {
  let data = Array.from(todos.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  if (filters?.status) data = data.filter((t) => (filters.status === 'open' ? t.status !== 'completed' : t.status === filters.status));
  if (filters?.priority) data = data.filter((t) => t.priority === filters.priority);
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    data = data.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q)
    );
  }
  return data;
}

export function getTodo(id: string): Todo | null {
  return todos.get(id) || null;
}

export function addTodo(data: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>): Todo {
  return createTodo(data);
}

export function updateTodo(id: string, patch: Partial<Todo>): { success: boolean; todo?: Todo; error?: string } {
  const todo = patchTodo(id, patch);
  if (!todo) return { success: false, error: 'Todo not found' };
  if (patch.status === 'completed') {
    addNotification({
      companyId: 'demo-company',
      userId: 'user-1',
      title: 'Task Completed',
      titleAr: 'اكتملت المهمة',
      message: `Task "${todo.title}" was marked as completed`,
      messageAr: `تم إكمال المهمة "${todo.title}"`,
      type: 'success',
      read: false,
      link: '/todos',
    });
  }
  return { success: true, todo };
}

export function deleteTodo(id: string): { success: boolean; error?: string } {
  return removeTodo(id) ? { success: true } : { success: false, error: 'Todo not found' };
}
