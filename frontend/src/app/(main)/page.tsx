// 대시보드 페이지 — 메인 홈 (최근 세션, 프로젝트 요약, 활동 피드)

import RecentSessionsCard from "./_components/RecentSessionsCard";
import ProjectSummaryCard from "./_components/ProjectSummaryCard";
import ActivityFeedCard from "./_components/ActivityFeedCard";

export default function DashboardPage() {
  return (
    <div className="min-h-full bg-[#F5F5EF] p-8">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">대시보드</h1>
        <p className="mt-1 text-sm text-[#6B6B7B]">
          팀의 최근 활동과 프로젝트 현황을 한눈에 확인하세요.
        </p>
      </div>

      {/* 카드 그리드: 왼쪽 2/3은 세션+피드, 오른쪽 1/3은 요약 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽 컬럼 — 최근 세션 + 활동 피드 */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <RecentSessionsCard />
          <ActivityFeedCard />
        </div>

        {/* 오른쪽 컬럼 — 프로젝트 요약 */}
        <div className="lg:col-span-1">
          <ProjectSummaryCard />
        </div>
      </div>
    </div>
  );
}
