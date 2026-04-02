// 인증 상태 스토어

import { create } from 'zustand';
import type { User } from '@/types/user';

/** 인증 상태 인터페이스 */
interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

/** 인증 상태 전역 스토어 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));
