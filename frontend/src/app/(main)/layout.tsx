// 메인 레이아웃 — 사이드바 + 콘텐츠 영역

import { Sidebar } from '@/components/sidebar/Sidebar';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen" style={{ backgroundColor: '#1A1A2E' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
