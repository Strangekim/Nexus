// 커밋 필터 컴포넌트 — 세션별, 작성자별 드롭다운

'use client';

import { useTree } from '@/hooks/useTree';

interface CommitFiltersProps {
  projectId: string;
  sessionId: string;
  author: string;
  onSessionChange: (v: string) => void;
  onAuthorChange: (v: string) => void;
}

export function CommitFilters({
  projectId,
  sessionId,
  author,
  onSessionChange,
  onAuthorChange,
}: CommitFiltersProps) {
  const { data: tree } = useTree();

  // 현재 프로젝트의 모든 세션 수집
  const project = tree?.find((p) => p.id === projectId);
  const sessions = [
    ...(project?.sessions ?? []),
    ...(project?.folders.flatMap((f) => f.sessions) ?? []),
  ];

  const selectClass =
    'h-8 rounded-md border border-[#E8E5DE] bg-white px-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#2D7D7B] cursor-pointer';

  return (
    <div className="flex flex-wrap gap-2">
      {/* 세션 필터 */}
      <select
        value={sessionId}
        onChange={(e) => onSessionChange(e.target.value)}
        className={selectClass}
      >
        <option value="">전체 세션</option>
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </select>

      {/* 작성자 필터 */}
      <input
        type="text"
        value={author}
        onChange={(e) => onAuthorChange(e.target.value)}
        placeholder="작성자 검색..."
        className="h-8 rounded-md border border-[#E8E5DE] bg-white px-2.5 text-xs text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#2D7D7B] w-36"
      />

      {/* 필터 초기화 */}
      {(sessionId || author) && (
        <button
          onClick={() => { onSessionChange(''); onAuthorChange(''); }}
          className="h-8 px-2.5 rounded-md text-xs text-[#6B6B7B] hover:text-[#1A1A1A] hover:bg-[#F5F5EF] border border-[#E8E5DE] transition-colors"
        >
          초기화
        </button>
      )}
    </div>
  );
}
