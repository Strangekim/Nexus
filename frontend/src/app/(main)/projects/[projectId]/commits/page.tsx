// 커밋 타임라인 페이지 — 세션별/작성자별 필터 + 목록

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { GitCommit, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useCommits } from '@/hooks/useCommits';
import { CommitTimeline } from '@/components/git/CommitTimeline';
import { CommitFilters } from './_components/CommitFilters';

export default function CommitsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [sessionId, setSessionId] = useState('');
  const [author, setAuthor] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useCommits(projectId, {
    page,
    limit: 30,
    sessionId: sessionId || undefined,
    author: author || undefined,
  });

  const commits = data?.commits ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 30);

  return (
    <div className="min-h-full bg-[#F5F5EF]">
      {/* 헤더 */}
      {/* 모바일에서 패딩 축소 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E5DE] px-4 lg:px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-[#6B6B7B] hover:text-[#1A1A1A] transition-colors"
          >
            <ChevronLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <GitCommit size={18} className="text-[#2D7D7B]" />
            <h1 className="text-base font-semibold text-[#1A1A1A]">커밋 타임라인</h1>
          </div>
          {!isLoading && (
            <span className="text-xs text-[#9CA3AF] ml-1">총 {total}개</span>
          )}
        </div>

        {/* 필터 */}
        <div className="mt-3">
          <CommitFilters
            projectId={projectId}
            sessionId={sessionId}
            author={author}
            onSessionChange={(v) => { setSessionId(v); setPage(1); }}
            onAuthorChange={(v) => { setAuthor(v); setPage(1); }}
          />
        </div>
      </div>

      {/* 본문 */}
      {/* 모바일에서 좌우 패딩 축소 */}
      <div className="max-w-2xl mx-auto px-4 lg:px-6 py-6">
        {isLoading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-[#E8E5DE] animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            커밋 목록을 불러오지 못했습니다.
          </div>
        )}

        {!isLoading && !isError && (
          <CommitTimeline commits={commits} projectId={projectId} />
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded-md border border-[#E8E5DE] disabled:opacity-40 hover:bg-[#F5F5EF]"
            >
              이전
            </button>
            <span className="px-3 py-1.5 text-sm text-[#6B6B7B]">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm rounded-md border border-[#E8E5DE] disabled:opacity-40 hover:bg-[#F5F5EF]"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
