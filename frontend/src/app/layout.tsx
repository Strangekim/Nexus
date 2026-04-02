import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import "./globals.css";

/** 기본 산세리프 폰트 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/** 모노스페이스 폰트 (코드 표시용) */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nexus",
  description: "팀 전용 웹 기반 자연어 코딩 + PM 플랫폼",
};

/** 루트 레이아웃 — 다크 모드 기본 적용, 프로바이더 래핑 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* 네트워크 오프라인 감지 배너 — 최상단 고정 */}
        <OfflineBanner />
        <QueryProvider>
          <ErrorBoundary>
            <AuthProvider>{children}</AuthProvider>
          </ErrorBoundary>
        </QueryProvider>
      </body>
    </html>
  );
}
