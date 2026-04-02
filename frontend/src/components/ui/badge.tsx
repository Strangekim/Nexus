// Badge UI 컴포넌트 — shadcn/ui 패턴 (인라인 구현)
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

/** 상태/레이블 표시용 뱃지 컴포넌트 */
export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors';
  const variants = {
    default: 'bg-[#2D7D7B] text-white',
    secondary: 'bg-gray-100 text-gray-700',
    destructive: 'bg-red-100 text-red-700',
    outline: 'border border-gray-300 text-gray-700',
  };

  return (
    <span
      className={cn(base, variants[variant], className)}
      {...props}
    />
  );
}
