// 개별 커밋 카드 — 해시, 메시지, 작성자, 통계 표시

import { FileText, User, Clock } from 'lucide-react';
import { getSessionColor } from './sessionColor';
import type { Commit } from '@/types/commit';

/** 시간 상대 표시 */
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

interface CommitCardProps {
  commit: Commit;
  onClick?: () => void;
}

export function CommitCard({ commit, onClick }: CommitCardProps) {
  const sessionColor = getSessionColor(commit.sessionId);

  return (
    <button
      onClick={onClick}
      className="w-full text-left group"
    >
      <div className="rounded-lg border border-[#E8E5DE] bg-white p-3 transition-all hover:border-[#2D7D7B] hover:shadow-sm">
        {/* 상단: 해시 + 시간 */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            {/* 세션 색상 뱃지 */}
            <div
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: sessionColor }}
              title={commit.session?.title ?? '세션 없음'}
            />
            <code className="text-[11px] font-mono bg-[#F5F5EF] text-[#6B6B7B] px-1.5 py-0.5 rounded">
              {commit.hash.slice(0, 7)}
            </code>
            {commit.session && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium truncate max-w-[120px]"
                style={{ backgroundColor: `${sessionColor}20`, color: sessionColor }}
              >
                {commit.session.title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[#9CA3AF] text-[11px] shrink-0">
            <Clock size={11} />
            {relativeTime(commit.committedAt)}
          </div>
        </div>

        {/* 커밋 메시지 */}
        <p className="text-sm font-medium text-[#1A1A1A] leading-snug line-clamp-2 mb-2">
          {commit.message}
        </p>

        {/* 하단: 작성자 + 파일 수 + 통계 */}
        <div className="flex items-center gap-3 text-xs text-[#6B6B7B]">
          <span className="flex items-center gap-1">
            <User size={11} />
            {commit.author}
          </span>
          <span className="flex items-center gap-1">
            <FileText size={11} />
            {commit.filesChanged.length}개 파일
          </span>
          <span className="text-[#16a34a] font-medium">+{commit.additions}</span>
          {commit.deletions > 0 && (
            <span className="text-[#dc2626] font-medium">-{commit.deletions}</span>
          )}
        </div>
      </div>
    </button>
  );
}
