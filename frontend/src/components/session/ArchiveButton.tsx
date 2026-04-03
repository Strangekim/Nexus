'use client';
// 세션 Merge / 아카이브 버튼

import { useState } from 'react';
import { GitMerge, Archive, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { updateSession } from '@/services/api/projects';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  sessionId: string;
  status: string;
  mergeStatus: string;
}

type ResultState = 'merged' | 'conflict' | 'archived' | 'error' | null;

export function ArchiveButton({ sessionId, status, mergeStatus }: Props) {
  const [loading, setLoading] = useState<'merge' | 'archive' | null>(null);
  const [result, setResult] = useState<ResultState>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tree'] });
    queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
  };

  // 이미 아카이브된 세션이면 상태만 표시
  if (status === 'archived') {
    return (
      <span
        className="text-xs px-2 py-1 rounded-full font-medium"
        style={{
          backgroundColor: mergeStatus === 'merged' ? '#16a34a14' : '#E0845E14',
          color: mergeStatus === 'merged' ? '#16a34a' : '#E0845E',
        }}
      >
        {mergeStatus === 'merged' ? 'Merged & Archived' : 'Conflict'}
      </span>
    );
  }

  /** Merge only — 세션/worktree 유지, main에 반영만 */
  const handleMerge = async () => {
    setLoading('merge');
    setResult(null);
    setErrorMsg('');
    try {
      const res = await apiFetch<{ mergeStatus: string; message: string }>(
        `/api/sessions/${sessionId}/merge`,
        { method: 'POST', body: '{}' },
      );
      setResult(res.mergeStatus === 'merged' ? 'merged' : 'conflict');
      invalidate();
    } catch (err) {
      setResult('error');
      setErrorMsg(err instanceof Error ? err.message : 'Merge 실패');
    } finally {
      setLoading(null);
    }
  };

  /** 아카이브 — merge + 세션 종료 + worktree 삭제 */
  const handleArchive = async () => {
    if (!confirm('세션을 종료하시겠습니까?\nmerge 후 워크트리가 삭제되며, 이 세션에서 더 이상 작업할 수 없습니다.')) return;
    setLoading('archive');
    setResult(null);
    setErrorMsg('');
    try {
      await updateSession(sessionId, { status: 'archived' });
      setResult('archived');
      invalidate();
    } catch (err) {
      setResult('error');
      setErrorMsg(err instanceof Error ? err.message : '아카이브 실패');
    } finally {
      setLoading(null);
    }
  };

  // 결과 표시
  if (result === 'merged') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-1 rounded-full font-medium bg-[#16a34a14] text-[#16a34a]">
          Merge 완료
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setResult(null)}
          className="text-[10px] h-6 px-2 border-[#E8E5DE]"
        >
          확인
        </Button>
      </div>
    );
  }

  if (result === 'archived') {
    return (
      <span className="text-xs px-2 py-1 rounded-full font-medium bg-[#6B6B7B14] text-[#6B6B7B]">
        세션 종료됨
      </span>
    );
  }

  if (result === 'conflict') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-1 rounded-full font-medium bg-[#E0845E14] text-[#E0845E]">
          Merge 충돌
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setResult(null)}
          className="text-[10px] h-6 px-2 border-[#E8E5DE]"
        >
          확인
        </Button>
      </div>
    );
  }

  if (result === 'error') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-1 rounded-full font-medium bg-[#E0845E14] text-[#E0845E]">
          {errorMsg || '오류 발생'}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setResult(null)}
          className="text-[10px] h-6 px-2 border-[#E8E5DE]"
        >
          닫기
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {/* Merge 버튼 — main에 반영, 세션 유지 */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleMerge}
        disabled={!!loading}
        className="gap-1 text-xs h-7 border-[#E8E5DE] hover:bg-[#F5F5EF]"
      >
        {loading === 'merge' ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <GitMerge size={12} className="text-[#2D7D7B]" />
        )}
        Merge
      </Button>

      {/* 아카이브 버튼 — merge + 세션 종료 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleArchive}
        disabled={!!loading}
        className="gap-1 text-xs h-7 text-[#6B6B7B] hover:text-[#E0845E] hover:bg-[#E0845E08]"
        title="세션 종료 (merge + worktree 삭제)"
      >
        {loading === 'archive' ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Archive size={12} />
        )}
      </Button>
    </div>
  );
}
