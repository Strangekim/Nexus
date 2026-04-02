// 활동 피드 카드 — activity API 연동 (온라인 사용자 + 정적 피드)
'use client';

import { Activity, Users, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useDashboardActivity } from '@/hooks/useDashboard';

interface Props {
  projectId: string;
}

/** 이름 이니셜 추출 */
function getInitial(name: string): string {
  return name.slice(0, 1);
}

/** 아바타 배경색 — 이름 해시 기반 */
const AVATAR_COLORS = ['#2D7D7B', '#E0845E', '#5B7D9A', '#7D6B2D', '#7D2D5B'];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function ActivityFeedCard({ projectId }: Props) {
  const { data, isLoading, isError } = useDashboardActivity(projectId);
  const onlineUsers = (data?.onlineUsers ?? []).filter(Boolean) as { id: string; name: string }[];

  return (
    <Card className="bg-white border border-[#E8E5DE] shadow-none rounded-xl">
      <CardHeader className="border-b border-[#E8E5DE] pb-3">
        <CardTitle className="flex items-center gap-2 text-[#1A1A1A] text-sm font-semibold">
          <Activity size={15} className="text-[#2D7D7B]" />
          온라인 팀원
          {isLoading && <RefreshCw size={12} className="text-[#6B6B7B] animate-spin ml-auto" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 pb-3">
        {isError && (
          <p className="text-xs text-[#6B6B7B] text-center py-4">데이터를 불러올 수 없습니다.</p>
        )}
        {!isLoading && !isError && onlineUsers.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 text-[#6B6B7B]">
            <Users size={24} className="opacity-40" />
            <p className="text-xs">최근 1시간 내 활동한 팀원이 없습니다.</p>
          </div>
        )}
        {onlineUsers.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {onlineUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F5F5EF]">
                {/* 아바타 */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                  style={{ backgroundColor: avatarColor(user.name) }}
                >
                  {getInitial(user.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1A1A1A] truncate">{user.name}</p>
                  {/* 온라인 표시 */}
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    <span className="text-[10px] text-[#6B6B7B]">온라인</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
