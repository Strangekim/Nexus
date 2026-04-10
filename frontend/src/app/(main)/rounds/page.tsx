// 분류 과제(라운드) 목록 페이지 — 진행 중/완료된 라운드 표시
'use client';

import Link from 'next/link';
import { CheckCircle2, Clock, ListChecks } from 'lucide-react';
import { useRounds } from '@/hooks/useRounds';
import type { RoundSummary } from '@/services/api/rounds';

export default function RoundsPage() {
  const { data: rounds, isLoading } = useRounds();

  const open = rounds?.filter((r) => r.status === 'open') ?? [];
  const closed = rounds?.filter((r) => r.status === 'closed') ?? [];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 space-y-6">
        <header>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-[#1A1A1A]">
            <ListChecks className="size-5 text-[#2D7D7B]" />
            분류 과제
          </h1>
          <p className="mt-1 text-sm text-[#6B6B7B]">
            팀원 모두가 같은 분류로 응답하면 자동으로 골드셋에 등록됩니다.
          </p>
        </header>

        {isLoading && <p className="text-sm text-[#9B9B9B]">로딩 중...</p>}

        {!isLoading && rounds?.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#E8E5DE] p-8 text-center">
            <p className="text-sm text-[#9B9B9B]">아직 발급된 과제가 없습니다.</p>
          </div>
        )}

        {open.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-[#6B6B7B]">진행 중 ({open.length})</h2>
            <div className="space-y-2">
              {open.map((r) => (
                <RoundCard key={r.id} round={r} />
              ))}
            </div>
          </section>
        )}

        {closed.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-[#6B6B7B]">완료 ({closed.length})</h2>
            <div className="space-y-2">
              {closed.map((r) => (
                <RoundCard key={r.id} round={r} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function RoundCard({ round }: { round: RoundSummary }) {
  const progress = round.itemCount > 0 ? (round.myProgress / round.itemCount) * 100 : 0;
  const isComplete = round.myProgress === round.itemCount;
  const isClosed = round.status === 'closed';

  return (
    <Link href={`/rounds/${round.id}`} className="block">
      <div className="rounded-lg border border-[#E8E5DE] bg-white p-4 transition-colors hover:border-[#2D7D7B]/50 hover:bg-[#F5F5EF]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-medium text-[#1A1A1A]">{round.title}</h3>
              {isClosed && (
                <span className="rounded-full bg-[#9B9B9B]/10 px-2 py-0.5 text-xs text-[#9B9B9B]">
                  마감
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[#9B9B9B]">
              {round.creator.name} · {new Date(round.createdAt).toLocaleDateString('ko-KR')}
            </p>
          </div>
          <div className="text-right text-xs shrink-0">
            <div className="flex items-center gap-1 text-[#6B6B7B]">
              {isComplete ? (
                <CheckCircle2 className="size-3.5 text-[#2D7D7B]" />
              ) : (
                <Clock className="size-3.5" />
              )}
              <span className={isComplete ? 'text-[#2D7D7B]' : ''}>
                {round.myProgress} / {round.itemCount}
              </span>
            </div>
          </div>
        </div>

        {/* 진행률 바 */}
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#F5F5EF]">
          <div
            className="h-full rounded-full bg-[#2D7D7B] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
