// 퀴즈 단일 문항 카드 — 오디오 + 분류 선택 + 제출
'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CategorySelector } from './CategorySelector';
import { InlineAudioPlayer } from './InlineAudioPlayer';
import { useSubmitResponse } from '@/hooks/useRounds';
import type { RoundItem } from '@/services/api/rounds';

interface Props {
  roundId: string;
  item: RoundItem;
  index: number;
  total: number;
  readOnly?: boolean;
}

export function QuizItemCard({ roundId, item, index, total, readOnly }: Props) {
  const [major, setMajor] = useState<string | null>(item.myResponse?.major ?? null);
  const [mid, setMid] = useState<string | null>(item.myResponse?.mid ?? null);
  const [sub, setSub] = useState<string | null>(item.myResponse?.sub ?? null);
  const [error, setError] = useState<string | null>(null);

  // item 변경 시 내 응답 동기화
  useEffect(() => {
    setMajor(item.myResponse?.major ?? null);
    setMid(item.myResponse?.mid ?? null);
    setSub(item.myResponse?.sub ?? null);
    setError(null);
  }, [item.id, item.myResponse]);

  const submit = useSubmitResponse(roundId);

  function handleChange(m: string | null, md: string | null, s: string | null) {
    setMajor(m);
    setMid(md);
    setSub(s);
    setError(null);
  }

  async function handleSubmit() {
    if (!major || !mid) {
      setError('대분류와 중분류를 모두 선택해 주세요');
      return;
    }
    setError(null);
    try {
      await submit.mutateAsync({ itemId: item.id, major, mid, sub });
    } catch (e: any) {
      setError(e?.message ?? '제출 실패');
    }
  }

  const hasMyResponse = !!item.myResponse;
  const isAgreed = item.status === 'agreed';
  const isDisagreed = item.status === 'disagreed';

  return (
    <div className="rounded-lg border border-[#E8E5DE] bg-white p-4 space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[#6B6B7B]">
          <span className="rounded bg-[#F5F5EF] px-2 py-0.5 font-mono">
            {index + 1} / {total}
          </span>
          <StatusBadge
            status={item.status}
            responseCount={item.responseCount}
          />
        </div>
        {hasMyResponse && !isAgreed && !isDisagreed && (
          <span className="flex items-center gap-1 text-xs text-[#2D7D7B]">
            <CheckCircle2 className="size-3.5" />
            응답 완료
          </span>
        )}
      </div>

      {/* 오디오 플레이어 */}
      <InlineAudioPlayer
        audioId={item.audioAsset.id}
        fileName={item.audioAsset.fileName}
      />

      {/* 합의된 정답 표시 */}
      {isAgreed && item.agreed && (
        <div className="rounded-md bg-[#2D7D7B]/10 px-3 py-2 text-xs text-[#2D7D7B]">
          <span className="font-medium">합의된 분류:</span>{' '}
          {item.agreed.major} &gt; {item.agreed.mid.replace(/_/g, ' ')}
          {item.agreed.sub && ` > ${item.agreed.sub.replace(/_/g, ' ')}`}
        </div>
      )}

      {/* 분류 셀렉터 */}
      <CategorySelector
        major={major}
        mid={mid}
        sub={sub}
        onChange={handleChange}
        disabled={readOnly || isAgreed}
      />

      {/* 에러 + 제출 */}
      {error && (
        <p className="flex items-center gap-1 text-xs text-[#E0845E]">
          <AlertCircle className="size-3.5" />
          {error}
        </p>
      )}

      {!readOnly && !isAgreed && (
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={submit.isPending || !major || !mid}
            className="bg-[#2D7D7B] text-white hover:bg-[#236968]"
          >
            {submit.isPending ? '제출 중...' : hasMyResponse ? '응답 수정' : '응답 제출'}
          </Button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  responseCount,
}: {
  status: 'pending' | 'agreed' | 'disagreed';
  responseCount: number;
}) {
  if (status === 'agreed') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-[#2D7D7B]/10 px-2 py-0.5 text-[#2D7D7B]">
        <CheckCircle2 className="size-3" />
        합의 완료
      </span>
    );
  }
  if (status === 'disagreed') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-[#E0845E]/10 px-2 py-0.5 text-[#E0845E]">
        <AlertCircle className="size-3" />
        불일치
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-[#F5F5EF] px-2 py-0.5 text-[#9B9B9B]">
      <Clock className="size-3" />
      응답 {responseCount}건
    </span>
  );
}
