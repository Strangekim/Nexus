---
name: zustand-store
description: Zustand 스토어 생성 및 슬라이스 패턴
---
# Zustand 스토어 코드 패턴

## 기본 스토어
```typescript
// stores/uiStore.ts
import { create } from 'zustand';

interface UiState {
  // 상태
  sidebarOpen: boolean;
  terminalHeight: number;

  // 액션
  toggleSidebar: () => void;
  setTerminalHeight: (height: number) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  // 초기값
  sidebarOpen: true,
  terminalHeight: 300,

  // 액션
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTerminalHeight: (height) => set({ terminalHeight: height }),
}));
```

## persist 미들웨어 (로컬 저장)
```typescript
// stores/settingsStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  theme: 'dark' | 'light';
  fontSize: number;
  setTheme: (theme: 'dark' | 'light') => void;
  setFontSize: (size: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      fontSize: 14,
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
    }),
    {
      name: 'nexus-settings', // localStorage 키
      partialize: (state) => ({
        theme: state.theme,
        fontSize: state.fontSize,
      }), // 액션 함수는 저장하지 않음
    },
  ),
);
```

## 슬라이스 패턴 (큰 스토어 분할)
```typescript
// stores/slices/authSlice.ts
import { StateCreator } from 'zustand';

export interface AuthSlice {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
});
```

```typescript
// stores/slices/onlineSlice.ts
import { StateCreator } from 'zustand';

export interface OnlineSlice {
  onlineUsers: Map<string, OnlineUser>;
  updateOnlineUser: (user: OnlineUser) => void;
  removeOnlineUser: (userId: string) => void;
}

export const createOnlineSlice: StateCreator<OnlineSlice> = (set) => ({
  onlineUsers: new Map(),
  updateOnlineUser: (user) =>
    set((state) => {
      const next = new Map(state.onlineUsers);
      next.set(user.id, user);
      return { onlineUsers: next };
    }),
  removeOnlineUser: (userId) =>
    set((state) => {
      const next = new Map(state.onlineUsers);
      next.delete(userId);
      return { onlineUsers: next };
    }),
});
```

```typescript
// stores/appStore.ts — 슬라이스 결합
import { create } from 'zustand';
import { createAuthSlice, AuthSlice } from './slices/authSlice';
import { createOnlineSlice, OnlineSlice } from './slices/onlineSlice';

type AppStore = AuthSlice & OnlineSlice;

export const useAppStore = create<AppStore>()((...a) => ({
  ...createAuthSlice(...a),
  ...createOnlineSlice(...a),
}));
```

## 컴포넌트에서 사용 (선택적 구독)
```tsx
// 필요한 상태만 선택 → 불필요한 리렌더링 방지
function Header() {
  const user = useAppStore((s) => s.user);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <header>
      <button onClick={toggleSidebar}>메뉴</button>
      <span>{user?.name}</span>
    </header>
  );
}
```

## 규칙
- 모든 주석은 한글로 작성
- 스토어 파일은 `stores/` 디렉토리에 배치
- 슬라이스가 3개 이상이면 `stores/slices/`로 분리
- 컴포넌트에서 항상 selector로 필요한 상태만 구독
- persist는 UI 설정 등 클라이언트 상태에만 사용, 서버 데이터는 TanStack Query 사용
