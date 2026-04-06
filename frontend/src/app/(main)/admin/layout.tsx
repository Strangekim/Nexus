// admin 레이아웃 — 정적 프리렌더링 비활성화
export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
