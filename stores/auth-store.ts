import { create } from 'zustand';
import { User } from '@/types';
import { authService } from '@/modules/auth/service';
import { storeToken, getStoredToken, clearStoredToken } from '@/lib/client-token';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const res = await authService.login(email, password);
    if (res.success && res.data) {
      const { user, token } = res.data;
      storeToken(token);
      set({ user, token, isAuthenticated: true });
      return { success: true };
    }
    return { success: false, error: res.error };
  },

  logout: () => {
    clearStoredToken();
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user: User) => set({ user }),

  checkAuth: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ isLoading: false });
      return;
    }
    const res = await authService.me();
    if (res.success && res.data) {
      set({ user: res.data.user, token, isAuthenticated: true, isLoading: false });
    } else if (res.error === 'Network error') {
      // Transient failure (server restart, flaky connection): keep the token
      // and the session alive instead of silently logging the user out.
      set({ token, isAuthenticated: true, isLoading: false });
    } else {
      clearStoredToken();
      set({ isLoading: false });
    }
  },
}));
