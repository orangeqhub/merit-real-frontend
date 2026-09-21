import { create } from 'zustand';
import { authService } from '../services/authService';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  initialised: false,

  init: async () => {
    const user = await authService.getSession();
    set({ user, loading: false, initialised: true });
  },

  setUser: (user) => set({ user }),

  logout: async () => {
    await authService.logout();
    set({ user: null });
  },
}));
