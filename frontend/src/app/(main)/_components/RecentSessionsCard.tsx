// 최근 세션 카드 — activity API 데이터 연동 (현재 락 보유 세션)
'use client';

import { Clock, FolderOpen, Lock, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useDashboardActivity } from '@/hooks/useDashboard';

interface Props {
  projectId: string;
}

/** 경과 시간 포맷 */
function formatElapsed(isoStr: string | null): string {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

export default function RecentSessionsCard({ projectId }: Props) {
  const { data, isLoading, isError } = useDashboardActivity(projectId);
  const sessions = data?.lockedSessions ?? [];

  return (
    <Card className="bg-white border border-[#E8E5DE] shadow-none rounded-xl">
      <CardHeader className="border-b border-[#E8E5DE] pb-3">
        <CardTitle className="flex items-center gap-2 text-[#1A1A1A] text-sm font-semibold">
          <Clock size={15} className="text-[#2D7D7B]" />
          현재 작업 중인 세션
          {isLoading && <RefreshCw size={12} className="text-[#6B6B7B] animate-spin ml-auto" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 pb-1">
        {isError && (
          <p className="text-xs text-[#6B6B7B] text-center py-4">데이터를 불러올 수 없습니다.</p>
        )}
        {!isLoading && !isError && sessions.length === 0 && (
          <p className="text-xs text-[#6B6B7B] text-center py-6">현재 작업 중인 세션이 없습니다.</p>
        )}
        {sessions.length > 0 && (
          <ul className="divide-y divide-[#E8E5DE]">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex items-center justify-between py-3 hover:bg-[#F5F5EF] -mx-4 px-4 rounded-lg cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 w-7 h-7 rounded-md bg-[#2D7D7B]/10 flex items-center justify-center">
                    <FolderOpen size={13} className="text-[#2D7D7B]" />
                  </div>
                  <div className="min-w-0">
                    {session.folder && (
                      <p className="text-xs text-[#6B6B7B] truncate">{session.folder.name}</p>
                    )}
                    <p className="text-sm font-medium text-[#1A1A1A] truncate">{session.title}</p>
                    {session.locker && (
                      <p className="text-xs text-[#E0845E] flex items-center gap-1 mt-0.5">
                        <Lock size={9} />
                        {session.locker.name}
                      </p>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-[#6B6B7B] ml-4">
                  {formatElapsed(session.lockedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
