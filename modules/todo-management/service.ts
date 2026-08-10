import { api } from '@/lib/api';
import { Todo } from '@/types';

export interface TodoFilters {
  status?: string;
  priority?: string;
  search?: string;
}

export const todoService = {
  getTodos: (filters?: TodoFilters) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.priority) params.set('priority', filters.priority);
    if (filters?.search) params.set('search', filters.search);
    return api.get<{ data: Todo[]; total: number }>(`/todos${params.toString() ? `?${params.toString()}` : ''}`);
  },

  getTodo: (id: string) => api.get<Todo>(`/todos/${id}`),

  createTodo: (data: Partial<Todo>) => api.post<Todo>('/todos', data),

  updateTodo: (id: string, patch: Partial<Todo>) => api.put<Todo>(`/todos/${id}`, patch),

  deleteTodo: (id: string) => api.delete<{ success: boolean }>(`/todos/${id}`),
};