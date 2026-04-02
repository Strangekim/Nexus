'use client';
// AlertDialog UI 컴포넌트 — 확인 다이얼로그 (인라인 구현, dialog.tsx 기반)
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

/** 확인/취소 다이얼로그 루트 컴포넌트 */
export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

/** 다이얼로그 컨텐츠 박스 */
export function AlertDialogContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className={cn(
        'relative z-10 w-full max-w-md rounded-xl bg-white shadow-xl p-6',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4', className)} {...props} />;
}

export function AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex justify-end gap-2 mt-6', className)} {...props} />;
}

export function AlertDialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-base font-semibold text-gray-900', className)} {...props} />;
}

export function AlertDialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-gray-500 mt-1', className)} {...props} />;
}

/** 취소 버튼 */
export function AlertDialogCancel({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** 확인(실행) 버튼 */
export function AlertDialogAction({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'px-4 py-2 rounded-lg text-sm font-medium bg-[#E0845E] text-white hover:opacity-85 transition-opacity disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
