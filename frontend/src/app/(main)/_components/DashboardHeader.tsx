// 대시보드 헤더 — 프로젝트 선택 드롭다운 + 기간 필터
'use client';

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

  return (
    <div className="flex flex-wrap items-center gap-3 mt-4">
      {/* 프로젝트 선택 드롭다운 */}
      <select
        value={projectId}
        onChange={(e) => onProjectChange(e.target.value)}
        className="h-9 rounded-lg border border-[#E8E5DE] bg-white px-3 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#2D7D7B]/30 cursor-pointer"
      >
        <option value="">프로젝트 선택</option>
        {tree.map((proj) => (
          <option key={proj.id} value={proj.id}>
            {proj.name}
          </option>
        ))}
      </select>

      {/* 기간 필터 탭 */}
      <div className="flex items-center gap-1 p-1 bg-white border border-[#E8E5DE] rounded-lg">
        {PERIOD_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onPeriodChange(value)}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
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
