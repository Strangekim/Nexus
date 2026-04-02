// 사용량 테이블 카드 — 팀원별 세션/메시지/비용 집계
'use client';

import { BarChart2, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useDashboardUsage } from '@/hooks/useDashboard';

interface Props {
  projectId: string;
}

/** 밀리초를 시간 문자열로 변환 */
function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}초`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}분`;
  return `${(ms / 3_600_000).toFixed(1)}시간`;
}

/** 아바타 배경색 — 이름 해시 기반 */
const COLORS = ['#2D7D7B', '#E0845E', '#5B7D9A', '#7D6B2D', '#7D2D5B'];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  return COLORS[hash % COLORS.length];
}

export default function UsageTableCard({ projectId }: Props) {
  const { data, isLoading, isError } = useDashboardUsage(projectId);
  const usage = data?.usage ?? [];

  return (
    <Card className="bg-white border border-[#E8E5DE] shadow-none rounded-xl">
      <CardHeader className="border-b border-[#E8E5DE] pb-3">
        <CardTitle className="flex items-center gap-2 text-[#1A1A1A] text-sm font-semibold">
          <BarChart2 size={15} className="text-[#2D7D7B]" />
          팀원별 사용량
          {isLoading && <RefreshCw size={12} className="text-[#6B6B7B] animate-spin ml-auto" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 pb-1 overflow-x-auto">
        {isError && (
          <p className="text-xs text-[#6B6B7B] text-center py-4">데이터를 불러올 수 없습니다.</p>
        )}
        {!isLoading && !isError && usage.length === 0 && (
          <p className="text-xs text-[#6B6B7B] text-center py-6">등록된 팀원이 없습니다.</p>
        )}
        {usage.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E5DE]">
                <th className="text-left py-2 text-xs text-[#6B6B7B] font-medium pr-4">팀원</th>
                <th className="text-right py-2 text-xs text-[#6B6B7B] font-medium px-2">세션</th>
                <th className="text-right py-2 text-xs text-[#6B6B7B] font-medium px-2">메시지</th>
                <th className="text-right py-2 text-xs text-[#6B6B7B] font-medium px-2">사용시간</th>
                <th className="text-right py-2 text-xs text-[#6B6B7B] font-medium pl-2">비용</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((row) => (
                <tr key={row.userId} className="border-b border-[#E8E5DE] last:border-0 hover:bg-[#F5F5EF]">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
                        style={{ backgroundColor: avatarColor(row.name) }}
                      >
                        {row.name.slice(0, 1)}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#1A1A1A]">{row.name}</p>
                        <p className="text-[10px] text-[#6B6B7B]">{row.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-right text-xs text-[#1A1A1A]">{row.sessionCount}</td>
                  <td className="py-2.5 px-2 text-right text-xs text-[#1A1A1A]">{row.messageCount.toLocaleString()}</td>
                  <td className="py-2.5 px-2 text-right text-xs text-[#6B6B7B]">
                    {row.totalDurationMs > 0 ? formatDuration(row.totalDurationMs) : '—'}
                  </td>
                  <td className="py-2.5 pl-2 text-right text-xs text-[#1A1A1A]">
                    {row.totalCostUsd > 0 ? `$${row.totalCostUsd.toFixed(4)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
