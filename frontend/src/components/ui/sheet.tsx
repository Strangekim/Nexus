'use client';
// Sheet 컴포넌트 — 사이드에서 슬라이드인하는 드로어 (모바일 사이드바 용)

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

/** Sheet 루트 — open 상태 + 오버레이 클릭 시 닫기 */
function Sheet({ open, onOpenChange, children }: SheetProps) {
  // ESC 키 닫기
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  // 열릴 때 body 스크롤 잠금
  React.useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* 반투명 오버레이 */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

interface SheetContentProps extends React.ComponentProps<'div'> {
  /** 드로어 위치 — 기본 left */
  side?: 'left' | 'right';
  onClose?: () => void;
}

/** Sheet 본문 패널 */
function SheetContent({
  side = 'left',
  className,
  children,
  onClose,
  ...props
}: SheetContentProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        'absolute top-0 bottom-0 flex flex-col bg-white shadow-xl',
        'w-72 animate-in duration-200',
        side === 'left'
          ? 'left-0 slide-in-from-left'
          : 'right-0 slide-in-from-right',
        className,
      )}
      {...props}
    >
      {/* 닫기 버튼 */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 rounded-md p-1 text-[#6B6B7B] hover:bg-[#F5F5EF] hover:text-[#1A1A1A] transition-colors"
          aria-label="닫기"
        >
          <X className="size-4" />
        </button>
      )}
      {children}
    </div>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-1.5 p-4', className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return (
    <h2
      className={cn('text-base font-semibold text-[#1A1A1A]', className)}
      {...props}
    />
  );
}

export { Sheet, SheetContent, SheetHeader, SheetTitle };
