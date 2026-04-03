// 대시보드 헤더 — 커스텀 프로젝트 선택 드롭다운 + 기간 필터
'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, FolderKanban, Check } from 'lucide-react';
import { useTree } from '@/hooks/useTree';
import type { DashboardPeriod } from '@/services/api/dashboard';

interface Props {
  projectId: string;
  period: DashboardPeriod;
  onProjectChange: (id: string) => void;
  onPeriodChange: (period: DashboardPeriod) => void;
}

const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: 'today', label: '오늘' },
  { value: 'week', label: '이번 주' },
  { value: 'month', label: '이번 달' },
];

export default function DashboardHeader({ projectId, period, onProjectChange, onPeriodChange }: Props) {
  const { data: tree = [] } = useTree();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const selectedProject = tree.find((p) => p.id === projectId);

  return (
    <div className="flex flex-wrap items-center gap-3 mt-4">
      {/* 커스텀 프로젝트 선택 드롭다운 */}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 h-9 rounded-lg border border-[#E8E5DE] bg-white px-3 text-sm text-[#1A1A1A] hover:border-[#2D7D7B]/40 focus:outline-none focus:ring-2 focus:ring-[#2D7D7B]/30 transition-colors cursor-pointer"
        >
          <FolderKanban className="size-4 text-[#2D7D7B]" />
          <span className={selectedProject ? 'text-[#1A1A1A]' : 'text-[#6B6B7B]'}>
            {selectedProject?.name ?? '프로젝트 선택'}
          </span>
          <ChevronDown className={`size-4 text-[#6B6B7B] transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-1 z-50 min-w-[200px] rounded-lg border border-[#E8E5DE] bg-white shadow-lg py-1 animate-in fade-in slide-in-from-top-1 duration-150">
            {tree.length === 0 && (
              <div className="px-3 py-2 text-sm text-[#6B6B7B]">프로젝트 없음</div>
            )}
            {tree.map((proj) => {
              const isSelected = proj.id === projectId;
              // 프로젝트 내 세션 수 계산
              const sessionCount =
                proj.sessions.length +
                proj.folders.reduce((sum, f) => sum + f.sessions.length, 0);
              return (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => { onProjectChange(proj.id); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#2D7D7B]/10 text-[#2D7D7B]'
                      : 'text-[#1A1A1A] hover:bg-[#F5F5EF]'
                  }`}
                >
                  <FolderKanban className={`size-4 shrink-0 ${isSelected ? 'text-[#2D7D7B]' : 'text-[#6B6B7B]'}`} />
                  <span className="flex-1 truncate font-medium">{proj.name}</span>
                  <span className="text-xs text-[#6B6B7B]">{sessionCount}개 세션</span>
                  {isSelected && <Check className="size-4 shrink-0 text-[#2D7D7B]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 기간 필터 탭 */}
      <div className="flex items-center gap-1 p-1 bg-white border border-[#E8E5DE] rounded-lg">
        {PERIOD_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onPeriodChange(value)}
            className={`px-3 py-1 rounded-md text-sm transition-colors cursor-pointer ${
              period === value
                ? 'bg-[#2D7D7B] text-white font-medium'
                : 'text-[#6B6B7B] hover:text-[#1A1A1A] hover:bg-[#F5F5EF]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
