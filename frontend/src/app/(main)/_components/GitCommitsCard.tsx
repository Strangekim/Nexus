// 최근 커밋 카드 — API 연동 타임라인 시각화
'use client';

import { GitCommit, RefreshCw } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { useCommits } from '@/hooks/useCommits';
import type { Commit } from '@/types/commit';

interface Props {
  projectId: string;
}

/** 커밋 시각 — ISO 문자열을 상대 시간으로 변환 (유효하지 않으면 빈 문자열) */
function relativeTime(iso: string | undefined | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 0) return '방금';
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  return `${Math.floor(hour / 24)}일 전`;
}

/** 변경량 막대 — additions/deletions 비율 시각화 */
function ChangesBar({ adds, dels }: { adds: number; dels: number }) {
  const total = adds + dels;
  const maxWidth = 80;
  const addW = total > 0 ? Math.max(2, (adds / total) * maxWidth) : 0;
  const delW = total > 0 ? Math.max(2, (dels / total) * maxWidth) : 0;

  return (
    <div className="flex items-center gap-1">
      <div className="flex h-1.5 rounded-full overflow-hidden" style={{ width: maxWidth }}>
        <div className="bg-[#2D7D7B] rounded-l-full" style={{ width: addW }} />
        {dels > 0 && <div className="bg-[#E0845E] rounded-r-full" style={{ width: delW }} />}
      </div>
      <span className="text-[10px] text-[#6B6B7B] whitespace-nowrap">
        <span className="text-[#2D7D7B]">+{adds}</span>
        {dels > 0 && <span className="text-[#E0845E]"> -{dels}</span>}
      </span>
    </div>
  );
}

/** 커밋 한 행 */
function CommitRow({ commit }: { commit: Commit }) {
  return (
    <div className="relative flex gap-3 py-3 group">
      {/* 타임라인 노드 */}
      <div className="relative z-10 mt-1 size-2 shrink-0 rounded-full bg-[#2D7D7B] ring-2 ring-white group-hover:ring-[#F5F5EF]" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] rounded bg-[#F5F5EF] px-1.5 py-0.5 text-[#6B6B7B]">
            {commit.hash.slice(0, 7)}
          </span>
          <span className="text-xs text-[#6B6B7B]">{relativeTime(commit.committedAt ?? commit.createdAt)}</span>
        </div>
        <p className="mt-0.5 text-sm font-medium text-[#1A1A1A] truncate">{commit.message}</p>
        <div className="mt-1 flex items-center gap-3">
          <span className="text-xs text-[#6B6B7B]">{commit.author}</span>
          <span className="text-[10px] text-[#6B6B7B]">{commit.filesChanged.length}개 파일</span>
          <ChangesBar adds={commit.additions} dels={commit.deletions} />
        </div>
      </div>
    </div>
  );
}

export default function GitCommitsCard({ projectId }: Props) {
  const { data, isLoading, isError } = useCommits(projectId, { limit: 5 });
  const commits = data?.commits ?? [];

  return (
    <Card className="bg-white border border-[#E8E5DE] shadow-none rounded-xl">
      <CardHeader className="border-b border-[#E8E5DE] pb-3">
        <CardTitle className="flex items-center gap-2 text-[#1A1A1A] text-sm font-semibold">
          <GitCommit size={15} className="text-[#2D7D7B]" />
          최근 커밋
          {isLoading && <RefreshCw size={12} className="text-[#6B6B7B] animate-spin ml-auto" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-1 pb-1">
        {isError && (
          <p className="text-xs text-[#6B6B7B] text-center py-4">데이터를 불러올 수 없습니다.</p>
        )}
        {!isLoading && !isError && commits.length === 0 && (
          <p className="text-xs text-[#6B6B7B] text-center py-6">커밋이 없습니다.</p>
        )}
        {commits.length > 0 && (
          /* 타임라인 */
          <div className="relative ml-3">
            {/* 세로 연결선 */}
            <div className="absolute left-0 top-4 bottom-4 w-px bg-[#E8E5DE]" />
            {commits.map((commit) => (
              <CommitRow key={commit.id} commit={commit} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
