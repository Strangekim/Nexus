'use client';
// 대시보드 클라이언트 영역 — 프로젝트 선택 상태 + 팀 질의 패널 통합

import { useState } from 'react';
import { useTree } from '@/hooks/useTree';
import TeamQueryPanel from '@/components/dashboard/TeamQueryPanel';
import RecentSessionsCard from './RecentSessionsCard';
import ProjectSummaryCard from './ProjectSummaryCard';
import ActivityFeedCard from './ActivityFeedCard';
import GitCommitsCard from './GitCommitsCard';
import BranchStatusCard from './BranchStatusCard';
import type { DashboardPeriod } from '@/services/api/dashboard';

/** 기간 필터 버튼 레이블 */
const PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: 'today', label: '오늘' },
  { value: 'week', label: '이번 주' },
  { value: 'month', label: '이번 달' },
];

export default function DashboardClient() {
  const { data: projects = [] } = useTree();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [period, setPeriod] = useState<DashboardPeriod>('week');

  // 첫 번째 실제 프로젝트 자동 선택
  const effectiveProjectId = selectedProjectId || projects[0]?.id || '';

  return (
    <>
      {/* 팀 질의 패널 — 대시보드 상단 */}
      <TeamQueryPanel projectId={effectiveProjectId} />

      {/* 프로젝트 + 기간 필터 바 */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6B6B7B]">프로젝트</span>
          <select
            value={effectiveProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-sm border border-[#E8E5DE] rounded-lg px-2.5 py-1.5 bg-white text-[#1A1A1A] outline-none focus:ring-1 focus:ring-[#2D7D7B]"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
            {projects.length === 0 && <option value="">프로젝트 없음</option>}
          </select>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={[
                'text-xs px-3 py-1.5 rounded-lg transition-colors',
                period === p.value
                  ? 'bg-[#2D7D7B] text-white'
                  : 'bg-white border border-[#E8E5DE] text-[#6B6B7B] hover:text-[#1A1A1A]',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 상단 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <RecentSessionsCard projectId={effectiveProjectId} />
          <ActivityFeedCard projectId={effectiveProjectId} />
        </div>
        <div className="lg:col-span-1">
          <ProjectSummaryCard projectId={effectiveProjectId} period={period} />
        </div>
      </div>

      {/* 하단 Git 섹션 */}
      <div className="mt-10 mb-4">
        <h2 className="text-base font-semibold text-[#1A1A1A]">Git 현황</h2>
        <p className="mt-0.5 text-sm text-[#6B6B7B]">최근 커밋 내역과 브랜치 상태를 확인하세요.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GitCommitsCard projectId={effectiveProjectId} />
        <BranchStatusCard projectId={effectiveProjectId} />
      </div>
    </>
  );
}
