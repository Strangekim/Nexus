'use client';
// 모바일 헤더 바 — 햄버거 메뉴 + 로고 + 알림 (lg 미만에서만 표시)

import Image from 'next/image';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notification/NotificationBell';
import { useUiStore } from '@/stores/uiStore';

export function MobileHeader() {
  const toggleMobileSidebar = useUiStore((s) => s.toggleMobileSidebar);

  return (
    // lg 이상에서는 숨김
    <header className="flex lg:hidden items-center justify-between border-b border-[#E8E5DE] bg-white px-3 py-2 shrink-0">
      {/* 햄버거 메뉴 버튼 */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggleMobileSidebar}
        aria-label="메뉴 열기"
        className="text-[#6B6B7B] hover:text-[#1A1A1A]"
      >
        <Menu className="size-5" />
      </Button>

      {/* 로고 — 대시보드로 이동 */}
      <Link href="/" className="transition-opacity hover:opacity-80">
        <Image
          src="/logo.png"
          alt="Nexus"
          width={100}
          height={28}
          style={{ height: 'auto' }}
        />
      </Link>

      {/* 알림 벨 */}
      <NotificationBell />
    </header>
  );
}
