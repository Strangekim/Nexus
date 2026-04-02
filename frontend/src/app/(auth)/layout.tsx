// 인증 페이지 레이아웃 — 중앙 정렬
// min-height: 100dvh — iOS Safari 주소창 문제 방지 (100vh fallback 포함)

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-center bg-[#F5F5EF] px-4"
      style={{ minHeight: '100dvh' }}
    >
      {children}
    </div>
  );
}
