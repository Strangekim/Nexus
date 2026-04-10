// 골드셋 브라우저 + 통계 대시보드
'use client';

import { useState } from 'react';
import { Award, TrendingUp } from 'lucide-react';
import { useGoldSet, useGoldSetStats } from '@/hooks/useRounds';
import { MAJOR_LABELS } from '@/lib/audio-taxonomy';
import { GoldSetCard } from '@/components/goldset/GoldSetCard';

export default function GoldSetPage() {
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data: stats } = useGoldSetStats();
  const { data: list, isLoading } = useGoldSet({
    major: selectedMajor ?? undefined,
    page,
    limit: 30,
  });

  function handleMajorChange(major: string | null) {
    setSelectedMajor(major);
    setPage(1);
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 space-y-6">
        {/* 헤더 */}
        <header>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-[#1A1A1A]">
            <Award className="size-5 text-[#2D7D7B]" />
            골드셋
          </h1>
          <p className="mt-1 text-sm text-[#6B6B7B]">
            팀원 전원이 합의한 검증된 분류 데이터입니다.
          </p>
        </header>

        {/* 통계 카드 */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="전체 골드셋" value={stats.total.toLocaleString()} />
            <StatCard
              label="커버리지"
              value={`${(stats.coverage * 100).toFixed(1)}%`}
              hint={`${stats.totalAudio.toLocaleString()}개 중`}
            />
            <StatCard
              label="최근 30일"
              value={stats.recent.reduce((s, r) => s + r.count, 0).toLocaleString()}
            />
            <StatCard
              label="대분류 종류"
              value={String(stats.byMajor.length)}
            />
          </div>
        )}

        {/* 대분류 필터 + 분포 */}
        {stats && stats.byMajor.length > 0 && (
          <section className="space-y-2">
            <h2 className="flex items-center gap-1.5 text-sm font-medium text-[#6B6B7B]">
              <TrendingUp className="size-4" />
              대분류 분포
            </h2>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip
                label="전체"
                count={stats.total}
                active={!selectedMajor}
                onClick={() => handleMajorChange(null)}
              />
              {stats.byMajor.map((m) => (
                <FilterChip
                  key={m.major}
                  label={MAJOR_LABELS[m.major] || m.major}
                  count={m.count}
                  active={selectedMajor === m.major}
                  onClick={() =>
                    handleMajorChange(selectedMajor === m.major ? null : m.major)
                  }
                />
              ))}
            </div>
          </section>
        )}

        {/* 골드셋 카드 그리드 */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#6B6B7B]">
              {selectedMajor
                ? `${MAJOR_LABELS[selectedMajor] || selectedMajor} — ${list?.total ?? 0}개`
                : `전체 ${list?.total ?? 0}개`}
            </p>
          </div>

          {isLoading && <p className="text-sm text-[#9B9B9B]">로딩 중...</p>}
          {!isLoading && list?.items.length === 0 && (
            <div className="rounded-lg border border-dashed border-[#E8E5DE] p-8 text-center text-sm text-[#9B9B9B]">
              아직 등록된 골드셋이 없습니다.
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {list?.items.map((g) => <GoldSetCard key={g.id} item={g} />)}
          </div>

          {/* 페이지네이션 */}
          {list && list.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded border border-[#E8E5DE] px-3 py-1 text-xs text-[#6B6B7B] hover:bg-[#F5F5EF] disabled:opacity-50"
              >
                이전
              </button>
              <span className="text-xs text-[#9B9B9B]">
                {page} / {list.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(list.totalPages, p + 1))}
                disabled={page >= list.totalPages}
                className="rounded border border-[#E8E5DE] px-3 py-1 text-xs text-[#6B6B7B] hover:bg-[#F5F5EF] disabled:opacity-50"
              >
                다음
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-[#E8E5DE] bg-white p-4">
      <p className="text-xs text-[#6B6B7B]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[#1A1A1A]">{value}</p>
      {hint && <p className="text-xs text-[#9B9B9B]">{hint}</p>}
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'border-[#2D7D7B] bg-[#2D7D7B] text-white'
          : 'border-[#E8E5DE] bg-white text-[#6B6B7B] hover:border-[#2D7D7B]/50 hover:text-[#2D7D7B]'
      }`}
    >
      {label}
      <span className={active ? 'text-white/70' : 'text-[#9B9B9B]'}>{count}</span>
    </button>
  );
}
