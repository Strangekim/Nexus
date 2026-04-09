// 카테고리 필터 칩 — major/mid 선택

'use client';

import { cn } from '@/lib/utils';
import { MAJOR_LABELS } from '@/lib/audio-taxonomy';
import type { CategoryNode } from '@/services/api/audio';

interface CategoryFilterProps {
  categories: CategoryNode[];
  selectedMajor: string | null;
  selectedMid: string | null;
  onSelectMajor: (major: string | null) => void;
  onSelectMid: (mid: string | null) => void;
}

export function CategoryFilter({
  categories,
  selectedMajor,
  selectedMid,
  onSelectMajor,
  onSelectMid,
}: CategoryFilterProps) {
  const activeMajor = categories.find((c) => c.major === selectedMajor);

  return (
    <div className="space-y-2">
      {/* major 칩 */}
      <div className="flex flex-wrap gap-1.5">
        <Chip
          label="전체"
          count={categories.reduce((sum, c) => sum + c.count, 0)}
          active={!selectedMajor}
          onClick={() => { onSelectMajor(null); onSelectMid(null); }}
        />
        {categories.map((cat) => (
          <Chip
            key={cat.major}
            label={MAJOR_LABELS[cat.major] || cat.major}
            count={cat.count}
            active={selectedMajor === cat.major}
            onClick={() => {
              onSelectMajor(selectedMajor === cat.major ? null : cat.major);
              onSelectMid(null);
            }}
          />
        ))}
      </div>

      {/* mid 칩 — major 선택 시 표시 */}
      {activeMajor && (
        <div className="flex flex-wrap gap-1.5">
          <Chip
            label="전체"
            count={activeMajor.count}
            active={!selectedMid}
            onClick={() => onSelectMid(null)}
            size="sm"
          />
          {activeMajor.children.map((mid) => (
            <Chip
              key={mid.mid}
              label={mid.mid.replace(/_/g, ' ')}
              count={mid.count}
              active={selectedMid === mid.mid}
              onClick={() => onSelectMid(selectedMid === mid.mid ? null : mid.mid)}
              size="sm"
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** 개별 필터 칩 */
function Chip({
  label,
  count,
  active,
  onClick,
  size = 'md',
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  size?: 'sm' | 'md';
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs',
        active
          ? 'border-[#2D7D7B] bg-[#2D7D7B] text-white'
          : 'border-[#E8E5DE] bg-white text-[#6B6B7B] hover:border-[#2D7D7B]/50 hover:text-[#2D7D7B]',
      )}
    >
      {label}
      <span className={cn('text-[10px]', active ? 'text-white/70' : 'text-[#9B9B9B]')}>
        {count}
      </span>
    </button>
  );
}
