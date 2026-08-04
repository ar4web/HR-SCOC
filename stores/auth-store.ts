import { create } from 'zustand';
import { User } from '@/types';
import { authService } from '@/modules/auth/service';

const TOKEN_KEY = 'scos_token';

function getTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setTokenCookie(token: string) {
  if (typeof window === 'undefined') return;
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=86400; SameSite=Lax`;
}

function clearToken() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

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
      try {
        localStorage.setItem(TOKEN_KEY, token);
      } catch {
        // ignore storage errors
      }
      setTokenCookie(token);
      set({ user, token, isAuthenticated: true });
      return { success: true };
    }
    return { success: false, error: res.error };
  },

  logout: () => {
    clearToken();
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user: User) => set({ user }),

  checkAuth: async () => {
    const token = getTokenFromStorage();
    if (!token) {
      set({ isLoading: false });
      return;
    }
    const res = await authService.me();
    if (res.success && res.data) {
      set({ user: res.data.user, token, isAuthenticated: true, isLoading: false });
    } else {
      clearToken();
      set({ isLoading: false });
    }
  },
}));
