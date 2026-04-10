// 라운드 퀴즈 풀기 페이지 — 한 화면에 한 문항씩 진행
'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRoundDetail } from '@/hooks/useRounds';
import { QuizItemCard } from '@/components/rounds/QuizItemCard';

export default function RoundDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? null;
  const { data: round, isLoading } = useRoundDetail(id);
  const [cursor, setCursor] = useState(0);

  // 첫 번째 미응답 항목으로 자동 이동 (최초 로드 시)
  const items = round?.items ?? [];
  const total = items.length;

  // 진행률
  const answered = useMemo(() => items.filter((i) => i.myResponse).length, [items]);

  if (isLoading || !round) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#9B9B9B]">
        로딩 중...
      </div>
    );
  }

  const item = items[cursor];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 space-y-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => router.push('/rounds')}
            className="flex items-center gap-1 text-sm text-[#6B6B7B] hover:text-[#1A1A1A]"
          >
            <ArrowLeft className="size-4" />
            과제 목록
          </button>
          <div className="text-xs text-[#9B9B9B]">
            진행 {answered} / {total}
          </div>
        </div>

        <div>
          <h1 className="text-lg font-semibold text-[#1A1A1A]">{round.title}</h1>
          <p className="mt-0.5 text-xs text-[#9B9B9B]">
            {round.creator.name} · {new Date(round.createdAt).toLocaleString('ko-KR')}
          </p>
        </div>

        {/* 진행률 바 */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F5F5EF]">
          <div
            className="h-full rounded-full bg-[#2D7D7B] transition-all"
            style={{ width: total > 0 ? `${(answered / total) * 100}%` : '0%' }}
          />
        </div>

        {/* 현재 문항 */}
        {item && (
          <QuizItemCard
            roundId={round.id}
            item={item}
            index={cursor}
            total={total}
            readOnly={round.status === 'closed'}
          />
        )}

        {/* 네비게이션 */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setCursor((c) => Math.max(0, c - 1))}
            disabled={cursor === 0}
          >
            <ChevronLeft className="size-4" />
            이전
          </Button>

          {/* 항목 점프 인디케이터 */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {items.map((it, i) => (
              <button
                key={it.id}
                onClick={() => setCursor(i)}
                className={`size-2 rounded-full transition-all ${
                  i === cursor
                    ? 'w-6 bg-[#2D7D7B]'
                    : it.myResponse
                      ? 'bg-[#2D7D7B]/40'
                      : 'bg-[#E8E5DE]'
                }`}
                title={`${i + 1}번 — ${it.myResponse ? '응답함' : '미응답'}`}
              />
            ))}
          </div>

          <Button
            variant="outline"
            onClick={() => setCursor((c) => Math.min(total - 1, c + 1))}
            disabled={cursor >= total - 1}
          >
            다음
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
