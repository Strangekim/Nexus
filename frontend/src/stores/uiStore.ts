// UI 상태 스토어 — 사이드바, 활성 패널 등 전역 UI 상태 관리

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** UI 상태 인터페이스 */
interface UiState {
  /** 사이드바 열림 여부 */
  sidebarOpen: boolean;
  /** 모바일 사이드바 드로어 열림 여부 */
  mobileSidebarOpen: boolean;
  /** 현재 활성화된 패널 */
  activePanel: 'chat' | 'terminal' | null;

  // 액션
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setActivePanel: (panel: 'chat' | 'terminal' | null) => void;
}

/** UI 상태 전역 스토어 — 사이드바 상태는 localStorage에 유지 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      mobileSidebarOpen: false,
      activePanel: 'chat',

      /** 사이드바 토글 */
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      /** 사이드바 상태 직접 설정 */
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      /** 모바일 사이드바 드로어 토글 */
      toggleMobileSidebar: () =>
        set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),

      /** 모바일 사이드바 드로어 상태 직접 설정 */
      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

      /** 활성 패널 변경 */
      setActivePanel: (activePanel) => set({ activePanel }),
    }),
    {
      name: 'nexus-ui',
      // 사이드바 상태만 영속화
      partialize: (state) => ({ sidebarOpen: state.sidebarOpen }),
    },
  ),
);
