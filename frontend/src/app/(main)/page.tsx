// 대시보드 페이지 — 프로젝트 선택 + 기간 필터 + 실제 API 연동
'use client';
export const dynamic = 'force-dynamic';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useTree } from '@/hooks/useTree';
import RecentSessionsCard from './_components/RecentSessionsCard';
import ProjectSummaryCard from './_components/ProjectSummaryCard';
import ActivityFeedCard from './_components/ActivityFeedCard';
import GitCommitsCard from './_components/GitCommitsCard';
import BranchStatusCard from './_components/BranchStatusCard';
import FileChangeMap from './_components/FileChangeMap';
import UsageTableCard from './_components/UsageTableCard';
import DashboardHeader from './_components/DashboardHeader';
import type { DashboardPeriod } from '@/services/api/dashboard';

/** 대시보드 본문 — searchParams 사용 */
function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const { data: projects = [] } = useTree();
  const projectId = searchParams.get('projectId') ?? '';
  const period = (searchParams.get('period') as DashboardPeriod) ?? 'week';

  // 프로젝트가 로드되었는데 선택된 것이 없으면 첫 번째를 자동 선택
  useEffect(() => {
    if (!projectId && projects.length > 0) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('projectId', projects[0].id);
      router.replace(`/?${params.toString()}`);
    }
  }, [projectId, projects, searchParams, router]);

  /** URL query 업데이트 핸들러 */
  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`/?${params.toString()}`);
  };

  return (
    <div className="min-h-full bg-[#F5F5EF] p-4 lg:p-8">
      {/* 페이지 헤더 + 필터 */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">팀 대시보드</h1>
        <p className="mt-1 text-sm text-[#6B6B7B]">
          팀의 최근 활동과 프로젝트 현황을 한눈에 확인하세요.
        </p>
        {/* 프로젝트 선택 + 기간 필터 */}
        <DashboardHeader
          projectId={projectId}
          period={period}
          onProjectChange={(id) => updateParams('projectId', id)}
          onPeriodChange={(p) => updateParams('period', p)}
        />
      </div>

      {/* projectId가 없으면 선택 안내 */}
      {!projectId && (
        <div className="flex flex-col items-center justify-center py-24 text-[#6B6B7B]">
          <p className="text-base font-medium">프로젝트를 선택하면 대시보드가 표시됩니다.</p>
          <p className="text-sm mt-1">상단 드롭다운에서 프로젝트를 선택하세요.</p>
        </div>
      )}

      {projectId && (
        <>
          {/* 상단 그리드: 세션+피드(왼쪽), 통계 요약(오른쪽) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="lg:col-span-2 flex flex-col gap-4 lg:gap-6">
              <RecentSessionsCard projectId={projectId} />
              <ActivityFeedCard projectId={projectId} />
            </div>
            <div className="lg:col-span-1">
              <ProjectSummaryCard projectId={projectId} period={period} />
            </div>
          </div>

          {/* 파일 변경 히트맵 + 사용량 테이블 */}
          <div className="mt-4 lg:mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <FileChangeMap projectId={projectId} />
            <UsageTableCard projectId={projectId} />
          </div>

          {/* 하단 Git 섹션 */}
          <div className="mt-8 lg:mt-10 mb-4">
            <h2 className="text-base font-semibold text-[#1A1A1A]">Git 현황</h2>
            <p className="mt-0.5 text-sm text-[#6B6B7B]">최근 커밋 내역과 브랜치 상태를 확인하세요.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <GitCommitsCard projectId={projectId} />
            <BranchStatusCard projectId={projectId} />
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
