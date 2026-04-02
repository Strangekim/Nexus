// 프로젝트 요약 카드 — API 통계 데이터 연동 (커밋/세션/메시지 수)
'use client';

import { GitCommit, MonitorPlay, MessageSquare, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useDashboardStats } from '@/hooks/useDashboard';
import type { DashboardPeriod } from '@/services/api/dashboard';

interface Props {
  projectId: string;
  period: DashboardPeriod;
}

const STAT_CONFIG = [
  { key: 'commitCount' as const, label: '커밋', icon: GitCommit, color: '#2D7D7B', bg: '#2D7D7B1A' },
  { key: 'sessionCount' as const, label: '세션', icon: MonitorPlay, color: '#E0845E', bg: '#E0845E1A' },
  { key: 'messageCount' as const, label: '메시지', icon: MessageSquare, color: '#2D7D7B', bg: '#2D7D7B1A' },
];

export default function ProjectSummaryCard({ projectId, period }: Props) {
  const { data, isLoading, isError } = useDashboardStats(projectId, period);

  return (
    <Card className="bg-white border border-[#E8E5DE] shadow-none rounded-xl">
      <CardHeader className="border-b border-[#E8E5DE] pb-3">
        <CardTitle className="flex items-center gap-2 text-[#1A1A1A] text-sm font-semibold">
          <GitCommit size={15} className="text-[#2D7D7B]" />
          기간별 통계
          {isLoading && <RefreshCw size={12} className="text-[#6B6B7B] animate-spin ml-auto" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 pb-2">
        {isError && (
          <p className="text-xs text-[#6B6B7B] text-center py-4">데이터를 불러올 수 없습니다.</p>
        )}
        {!isError && (
          <div className="grid grid-cols-3 gap-3">
            {STAT_CONFIG.map(({ key, label, icon: Icon, color, bg }) => (
              <div key={key} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-[#F5F5EF]">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: bg }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <span className="text-2xl font-bold" style={{ color }}>
                  {isLoading ? '—' : (data?.[key] ?? 0).toLocaleString()}
                </span>
                <span className="text-xs text-[#6B6B7B] text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>
        )}
        {/* 일별 커밋 바 차트 */}
        {data && data.dailyCommits.length > 0 && (
          <DailyCommitChart data={data.dailyCommits} />
        )}
      </CardContent>
    </Card>
  );
}

/** 순수 CSS/SVG 일별 커밋 바 차트 */
function DailyCommitChart({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="mt-4">
      <p className="text-xs text-[#6B6B7B] mb-2">일별 커밋</p>
      <div className="flex items-end gap-1 h-14">
        {data.map(({ day, count }) => (
          <div key={day} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            <div
              className="w-full rounded-t"
              style={{
                height: `${Math.max((count / max) * 48, 2)}px`,
                backgroundColor: '#2D7D7B',
                opacity: 0.7 + (count / max) * 0.3,
              }}
            />
            {/* 툴팁 */}
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 hidden group-hover:block text-[10px] bg-[#1A1A1A] text-white rounded px-1 whitespace-nowrap z-10">
              {day.slice(5)} ({count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
