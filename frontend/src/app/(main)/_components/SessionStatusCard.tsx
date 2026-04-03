'use client';
// 세션 현황 카드 — 전체 세션 목록 + merge 상태 표시

import { GitMerge, GitBranch, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useDashboardActivity } from '@/hooks/useDashboard';

interface Props {
  projectId: string;
}

/** merge 상태별 아이콘 + 라벨 */
function MergeStatusBadge({ status, mergeStatus }: { status: string; mergeStatus: string }) {
  if (status === 'active') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium text-[#2D7D7B] bg-[#2D7D7B14] rounded-full px-2 py-0.5">
        <Clock size={10} />
        작업 중
      </span>
    );
  }
  if (mergeStatus === 'merged') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium text-[#16a34a] bg-[#16a34a14] rounded-full px-2 py-0.5">
        <CheckCircle size={10} />
        Merged
      </span>
    );
  }
  if (mergeStatus === 'conflict') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium text-[#E0845E] bg-[#E0845E14] rounded-full px-2 py-0.5">
        <AlertTriangle size={10} />
        Conflict
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium text-[#6B6B7B] bg-[#6B6B7B14] rounded-full px-2 py-0.5">
      <GitBranch size={10} />
      {mergeStatus}
    </span>
  );
}

/** 경과 시간 포맷 */
function formatElapsed(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

export default function SessionStatusCard({ projectId }: Props) {
  const { data, isLoading, isError } = useDashboardActivity(projectId);
  const sessions = data?.allSessions ?? [];

  // 통계 계산
  const active = sessions.filter((s) => s.status === 'active').length;
  const merged = sessions.filter((s) => s.mergeStatus === 'merged').length;
  const conflict = sessions.filter((s) => s.mergeStatus === 'conflict').length;

  return (
    <Card className="bg-white border border-[#E8E5DE] shadow-none rounded-xl">
      <CardHeader className="border-b border-[#E8E5DE] pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[#1A1A1A] text-sm font-semibold">
            <GitMerge size={15} className="text-[#2D7D7B]" />
            세션 현황
          </CardTitle>
          {sessions.length > 0 && (
            <div className="flex items-center gap-2 text-[10px] text-[#6B6B7B]">
              {active > 0 && <span className="text-[#2D7D7B]">{active} 진행</span>}
              {merged > 0 && <span className="text-[#16a34a]">{merged} 머지</span>}
              {conflict > 0 && <span className="text-[#E0845E]">{conflict} 충돌</span>}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-2 overflow-y-auto max-h-[420px]">
        {isLoading && (
          <div className="flex flex-col gap-2 py-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 rounded-md bg-[#F5F5EF] animate-pulse" />
            ))}
          </div>
        )}
        {isError && !isLoading && (
          <p className="py-8 text-center text-sm text-[#6B6B7B]">데이터를 불러오지 못했습니다.</p>
        )}
        {!isLoading && !isError && sessions.length === 0 && (
          <p className="py-8 text-center text-sm text-[#6B6B7B]">세션이 없습니다.</p>
        )}
        {!isLoading && sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center justify-between hover:bg-[#F5F5EF] rounded-md px-2 py-2.5 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-[#1A1A1A] truncate">
                    {session.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {session.folder && (
                    <span className="text-[10px] text-[#6B6B7B]">{session.folder.name}</span>
                  )}
                  {session.creator && (
                    <span className="text-[10px] text-[#6B6B7B]">{session.creator.name}</span>
                  )}
                  <span className="text-[10px] text-[#9CA3AF]">
                    {formatElapsed(session.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
            <div className="shrink-0 ml-3">
              <MergeStatusBadge status={session.status} mergeStatus={session.mergeStatus} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
