import { api } from '@/lib/api';
import { User } from '@/types';

export const authService = {
  login: (email: string, password: string) =>
    api.post<{ user: User; token: string }>('/auth/login', { email, password }),

  me: () => api.get<{ user: User }>('/auth/me'),
};
