// Diff 뷰어 페이지 — 커밋 상세 + 파일별 diff 표시

'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, GitCommit, User, Clock, FileText } from 'lucide-react';
import { useCommitDiff } from '@/hooks/useCommits';
import { DiffViewer } from '@/components/git/DiffViewer';
import { RevertButton } from '@/components/git/RevertButton';

/** 시간 포맷 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function CommitDiffPage() {
  const { projectId, hash } = useParams<{ projectId: string; hash: string }>();
  const { data, isLoading, isError } = useCommitDiff(projectId, hash);

  return (
    <div className="min-h-full bg-[#F5F5EF]">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E5DE] px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/projects/${projectId}/commits`}
              className="text-[#6B6B7B] hover:text-[#1A1A1A] shrink-0"
            >
              <ChevronLeft size={18} />
            </Link>
            <GitCommit size={16} className="text-[#2D7D7B] shrink-0" />
            <code className="font-mono text-sm text-[#6B6B7B] shrink-0">{hash.slice(0, 7)}</code>
            {data && (
              <span className="text-sm font-medium text-[#1A1A1A] truncate">
                {data.message}
              </span>
            )}
          </div>
          {data && (
            <RevertButton projectId={projectId} hash={hash} message={data.message} />
          )}
        </div>
      </div>

      {/* 커밋 메타 정보 */}
      {data && (
        <div className="bg-white border-b border-[#E8E5DE] px-6 py-3">
          <div className="max-w-4xl mx-auto flex flex-wrap gap-4 text-xs text-[#6B6B7B]">
            <span className="flex items-center gap-1.5">
              <User size={12} />
              {data.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={12} />
              {formatDate(data.committedAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <FileText size={12} />
              {data.files.length}개 파일 변경
            </span>
            <span className="text-[#16a34a] font-medium">+{data.additions}</span>
            <span className="text-[#dc2626] font-medium">-{data.deletions}</span>
          </div>
        </div>
      )}

      {/* 본문 */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 rounded-lg bg-[#E8E5DE] animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            Diff를 불러오지 못했습니다.
          </div>
        )}

        {data && <DiffViewer files={data.files} />}
      </div>
    </div>
  );
}
