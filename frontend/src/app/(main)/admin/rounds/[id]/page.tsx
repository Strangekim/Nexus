// 라운드 결과 상세 — 관리자 전용 (응답 분포 + 합의 여부)
'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useRoundResults } from '@/hooks/useRounds';

export default function AdminRoundResultsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const id = params?.id ?? null;
  const { data, isLoading } = useRoundResults(id);

  useEffect(() => {
    if (!authLoading && user && user.role !== 'admin') router.replace('/');
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  if (authLoading || !user || user.role !== 'admin') return null;
  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#9B9B9B]">
        로딩 중...
      </div>
    );
  }

  const { summary, items } = data;

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="mx-auto w-full max-w-5xl px-6 py-6 space-y-6">
        <button
          onClick={() => router.push('/admin/rounds')}
          className="flex items-center gap-1 text-sm text-[#6B6B7B] hover:text-[#1A1A1A]"
        >
          <ArrowLeft className="size-4" />
          라운드 목록
        </button>

        <div>
          <h1 className="text-2xl font-semibold text-[#1A1A1A]">라운드 결과</h1>
          <p className="mt-1 text-sm text-[#6B6B7B]">
            전체 {summary.total}건 중 합의 {summary.agreed}건 · 불일치 {summary.disagreed}건 ·
            대기 {summary.pending}건
          </p>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard
            label="합의"
            count={summary.agreed}
            total={summary.total}
            icon={CheckCircle2}
            color="#2D7D7B"
          />
          <SummaryCard
            label="불일치"
            count={summary.disagreed}
            total={summary.total}
            icon={AlertCircle}
            color="#E0845E"
          />
          <SummaryCard
            label="대기"
            count={summary.pending}
            total={summary.total}
            icon={Clock}
            color="#9B9B9B"
          />
        </div>

        {/* 항목 목록 */}
        <div className="space-y-3">
          {items.map((it) => (
            <ItemRow key={it.id} item={it} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  count,
  total,
  icon: Icon,
  color,
}: {
  label: string;
  count: number;
  total: number;
  icon: typeof CheckCircle2;
  color: string;
}) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
  return (
    <div className="rounded-lg border border-[#E8E5DE] bg-white p-4">
      <div className="flex items-center gap-2 text-sm" style={{ color }}>
        <Icon className="size-4" />
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-[#1A1A1A]">{count}</div>
      <div className="text-xs text-[#9B9B9B]">{pct}%</div>
    </div>
  );
}

function ItemRow({
  item,
}: {
  item: {
    id: string;
    audioAsset: { id: string; fileName: string; s3Key: string };
    status: 'pending' | 'agreed' | 'disagreed';
    agreed: { major: string; mid: string; sub: string | null } | null;
    responses: {
      userId: string;
      userName: string;
      major: string;
      mid: string;
      sub: string | null;
    }[];
  };
}) {
  const statusColor =
    item.status === 'agreed'
      ? 'bg-[#2D7D7B]/10 text-[#2D7D7B]'
      : item.status === 'disagreed'
        ? 'bg-[#E0845E]/10 text-[#E0845E]'
        : 'bg-[#F5F5EF] text-[#9B9B9B]';

  const statusLabel =
    item.status === 'agreed' ? '합의' : item.status === 'disagreed' ? '불일치' : '대기';

  return (
    <div className="rounded-lg border border-[#E8E5DE] bg-white p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-sm font-medium text-[#1A1A1A]" title={item.audioAsset.fileName}>
          {item.audioAsset.fileName}
        </p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {item.agreed && (
        <div className="rounded bg-[#2D7D7B]/10 px-2 py-1 text-xs text-[#2D7D7B]">
          합의 분류: {item.agreed.major} &gt; {item.agreed.mid.replace(/_/g, ' ')}
          {item.agreed.sub && ` > ${item.agreed.sub.replace(/_/g, ' ')}`}
        </div>
      )}

      <div className="space-y-1">
        {item.responses.map((r) => (
          <div
            key={r.userId}
            className="flex items-center justify-between gap-2 text-xs text-[#6B6B7B]"
          >
            <span className="font-medium text-[#1A1A1A]">{r.userName}</span>
            <span className="truncate">
              {r.major} &gt; {r.mid.replace(/_/g, ' ')}
              {r.sub && ` > ${r.sub.replace(/_/g, ' ')}`}
            </span>
          </div>
        ))}
        {item.responses.length === 0 && (
          <p className="text-xs text-[#9B9B9B]">아직 응답이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
