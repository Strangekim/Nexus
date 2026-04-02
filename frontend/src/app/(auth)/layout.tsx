// 인증 페이지 레이아웃 — 중앙 정렬

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5EF]">
      {children}
    </div>
  );
}
