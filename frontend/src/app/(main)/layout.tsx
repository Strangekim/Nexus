// 메인 레이아웃 — 사이드바 + 콘텐츠 영역 + 실시간 동기화 초기화

import { Sidebar } from '@/components/sidebar/Sidebar';
import { RealtimeProvider } from './_components/RealtimeProvider';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RealtimeProvider>
      <div className="flex h-screen bg-[#F5F5EF]">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </RealtimeProvider>
  );
}
