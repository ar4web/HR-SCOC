import { api } from '@/lib/api';
import { User, UserRole, Language } from '@/types';

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
  nameAr?: string;
  role: UserRole;
  language: Language;
  password?: string;
}

export const adminService = {
  getUsers: () => api.get<{ data: User[] }>('/administration?type=users'),
  getAuditLogs: () => api.get<{ data: AuditLog[] }>('/administration?type=audit'),

  createUser: (input: CreateUserInput) =>
    api.post<{ user: User }>('/administration', input),

  updateUser: (userId: string, updates: { role?: UserRole; name?: string; nameAr?: string; language?: Language }) =>
    api.put<{ user: User }>('/administration', { userId, ...updates }),

  removeUser: (userId: string) =>
    api.delete<{ success: boolean }>(`/administration?id=${userId}`),
};
