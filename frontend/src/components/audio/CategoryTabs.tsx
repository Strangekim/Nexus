// 카테고리 탭 네비게이션 — taxonomy 기반 대분류 > 중분류 > 소분류 드릴다운

'use client';

import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { AUDIO_TAXONOMY, MAJOR_LABELS } from '@/lib/audio-taxonomy';

interface CategoryTabsProps {
  selectedMajor: string | null;
  selectedMid: string | null;
  selectedSub: string | null;
  onSelectMajor: (major: string | null) => void;
  onSelectMid: (mid: string | null) => void;
  onSelectSub: (sub: string | null) => void;
}

export function CategoryTabs({
  selectedMajor,
  selectedMid,
  selectedSub,
  onSelectMajor,
  onSelectMid,
  onSelectSub,
}: CategoryTabsProps) {
  const activeMajor = AUDIO_TAXONOMY.find((c) => c.key === selectedMajor);
  const activeMid = activeMajor?.mids.find((m) => m.name === selectedMid);

  return (
    <div className="space-y-0">
      {/* 브레드크럼 */}
      {selectedMajor && (
        <div className="flex items-center gap-1 text-xs text-[#9B9B9B] mb-2">
          <button
            onClick={() => { onSelectMajor(null); onSelectMid(null); onSelectSub(null); }}
            className="hover:text-[#2D7D7B] transition-colors"
          >
            전체
          </button>
          <ChevronRight className="size-3" />
          <button
            onClick={() => { onSelectMid(null); onSelectSub(null); }}
            className={cn(
              'transition-colors',
              !selectedMid ? 'text-[#2D7D7B] font-medium' : 'hover:text-[#2D7D7B]',
            )}
          >
            {MAJOR_LABELS[selectedMajor] || selectedMajor}
          </button>
          {selectedMid && (
            <>
              <ChevronRight className="size-3" />
              <button
                onClick={() => onSelectSub(null)}
                className={cn(
                  'transition-colors',
                  !selectedSub ? 'text-[#2D7D7B] font-medium' : 'hover:text-[#2D7D7B]',
                )}
              >
                {selectedMid.replace(/_/g, ' ')}
              </button>
            </>
          )}
          {selectedSub && (
            <>
              <ChevronRight className="size-3" />
              <span className="text-[#2D7D7B] font-medium">
                {selectedSub.replace(/_/g, ' ')}
              </span>
            </>
          )}
        </div>
      )}

      {/* 대분류 탭 */}
      <div className="flex overflow-x-auto border-b border-[#E8E5DE] gap-0 scrollbar-hide">
        <Tab
          label="전체"
          active={!selectedMajor}
          onClick={() => { onSelectMajor(null); onSelectMid(null); onSelectSub(null); }}
        />
        {AUDIO_TAXONOMY.map((cat) => (
          <Tab
            key={cat.key}
            label={cat.label}
            active={selectedMajor === cat.key}
            onClick={() => {
              onSelectMajor(cat.key);
              onSelectMid(null);
              onSelectSub(null);
            }}
          />
        ))}
      </div>

      {/* 중분류 탭 */}
      {activeMajor && (
        <div className="flex overflow-x-auto border-b border-[#E8E5DE]/60 gap-0 bg-[#FAFAF8] scrollbar-hide">
          <Tab
            label="전체"
            active={!selectedMid}
            onClick={() => { onSelectMid(null); onSelectSub(null); }}
            size="sm"
          />
          {activeMajor.mids.map((mid) => (
            <Tab
              key={mid.name}
              label={mid.name.replace(/_/g, ' ')}
              active={selectedMid === mid.name}
              onClick={() => {
                onSelectMid(mid.name);
                onSelectSub(null);
              }}
              size="sm"
            />
          ))}
        </div>
      )}

      {/* 소분류 탭 */}
      {activeMid && activeMid.subs.length > 0 && (
        <div className="flex overflow-x-auto border-b border-[#E8E5DE]/40 gap-0 bg-[#F5F5EF] scrollbar-hide">
          <Tab
            label="전체"
            active={!selectedSub}
            onClick={() => onSelectSub(null)}
            size="xs"
          />
          {activeMid.subs.map((sub) => (
            <Tab
              key={sub}
              label={sub.replace(/_/g, ' ')}
              active={selectedSub === sub}
              onClick={() => onSelectSub(sub)}
              size="xs"
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** 개별 탭 */
function Tab({
  label,
  active,
  onClick,
  size = 'md',
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  size?: 'xs' | 'sm' | 'md';
}) {
  const sizeClasses = {
    xs: 'px-2.5 py-1.5 text-[11px]',
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-2.5 text-sm',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 font-medium whitespace-nowrap border-b-2 transition-colors',
        sizeClasses[size],
        active
          ? 'border-[#2D7D7B] text-[#2D7D7B]'
          : 'border-transparent text-[#6B6B7B] hover:text-[#1A1A1A] hover:border-[#E8E5DE]',
      )}
    >
      {label}
    </button>
  );
}
