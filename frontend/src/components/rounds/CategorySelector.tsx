// 분류 셀렉터 — major > mid > sub 3단 드릴다운 (퀴즈 응답 제출용)
'use client';

import { cn } from '@/lib/utils';
import { useCategoryTree } from '@/hooks/useRounds';

interface Props {
  major: string | null;
  mid: string | null;
  sub: string | null;
  onChange: (major: string | null, mid: string | null, sub: string | null) => void;
  disabled?: boolean;
}

export function CategorySelector({ major, mid, sub, onChange, disabled }: Props) {
  const { data: tree } = useCategoryTree();

  if (!tree) {
    return <div className="text-sm text-[#9B9B9B]">분류 로딩 중...</div>;
  }

  const activeMajor = tree.find((m) => m.key === major);
  const activeMid = activeMajor?.mids.find((md) => md.name === mid);

  return (
    <div className="space-y-3">
      {/* major */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#6B6B7B]">대분류</label>
        <div className="flex flex-wrap gap-1.5">
          {tree.map((m) => (
            <Chip
              key={m.key}
              label={m.label}
              active={major === m.key}
              disabled={disabled}
              onClick={() => onChange(m.key, null, null)}
            />
          ))}
        </div>
      </div>

      {/* mid */}
      {activeMajor && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#6B6B7B]">중분류</label>
          <div className="flex flex-wrap gap-1.5">
            {activeMajor.mids.map((md) => (
              <Chip
                key={md.name}
                label={md.name.replace(/_/g, ' ')}
                active={mid === md.name}
                disabled={disabled}
                onClick={() => onChange(major, md.name, null)}
                size="sm"
              />
            ))}
          </div>
        </div>
      )}

      {/* sub */}
      {activeMid && activeMid.subs.length > 0 && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#6B6B7B]">
            소분류 <span className="text-[#9B9B9B]">(선택)</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {activeMid.subs.map((s) => (
              <Chip
                key={s}
                label={s.replace(/_/g, ' ')}
                active={sub === s}
                disabled={disabled}
                onClick={() => onChange(major, mid, sub === s ? null : s)}
                size="sm"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({
  label,
  active,
  disabled,
  onClick,
  size = 'md',
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  size?: 'sm' | 'md';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center rounded-full border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs',
        active
          ? 'border-[#2D7D7B] bg-[#2D7D7B] text-white'
          : 'border-[#E8E5DE] bg-white text-[#6B6B7B] hover:border-[#2D7D7B]/50 hover:text-[#2D7D7B]',
      )}
    >
      {label}
    </button>
  );
}
