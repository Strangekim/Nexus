// 메인 레이아웃 — 사이드바 + 콘텐츠 영역 + 실시간 동기화 초기화

import { Sidebar } from '@/components/sidebar/Sidebar';
import { MobileSidebar } from '@/components/sidebar/Sidebar';
import { MobileHeader } from './_components/MobileHeader';
import { RealtimeProvider } from './_components/RealtimeProvider';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RealtimeProvider>
      {/* 높이: dvh 지원 브라우저는 100dvh, 미지원 시 100vh fallback (iOS Safari 주소창 문제 방지) */}
      <div className="flex bg-[#F5F5EF]" style={{ height: '100dvh' }}>
        {/* PC 고정 사이드바 (lg 이상) */}
        <Sidebar />

        {/* 모바일 드로어 사이드바 (lg 미만) */}
        <MobileSidebar />

        {/* 콘텐츠 영역 */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* 모바일 헤더 바 — 햄버거 + 로고 + 알림 (lg 미만에서만 표시) */}
          <MobileHeader />

          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </RealtimeProvider>
  );
}
