// 세로 타임라인 UI — 커밋 목록을 세션 색상으로 구분

'use client';

import { useRouter } from 'next/navigation';
import { getSessionColor } from './sessionColor';
import { CommitCard } from './CommitCard';
import type { Commit } from '@/types/commit';

interface CommitTimelineProps {
  commits: Commit[];
  projectId: string;
}

export function CommitTimeline({ commits, projectId }: CommitTimelineProps) {
  const router = useRouter();

  if (commits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[#9CA3AF]">
        <p className="text-sm">커밋이 없습니다.</p>
        <p className="text-xs mt-1">Claude Code로 작업을 시작하면 커밋이 자동으로 기록됩니다.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* 타임라인 세로선 */}
      <div className="absolute left-[19px] top-5 bottom-5 w-px bg-[#E8E5DE]" />

      <div className="space-y-3">
        {commits.map((commit) => {
          const color = getSessionColor(commit.sessionId);

          return (
            <div key={commit.id} className="relative flex gap-4">
              {/* 타임라인 노드 */}
              <div className="relative z-10 mt-4 shrink-0">
                <div
                  className="size-[10px] rounded-full ring-2 ring-white"
                  style={{ backgroundColor: color }}
                />
              </div>

              {/* 커밋 카드 */}
              <div className="flex-1 min-w-0">
                <CommitCard
                  commit={commit}
                  onClick={() =>
                    router.push(`/projects/${projectId}/commits/${commit.hash}`)
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
