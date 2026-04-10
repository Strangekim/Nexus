// 라운드 관리 페이지 — 관리자 전용
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Lock, ListChecks, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateRoundDialog } from '@/components/admin/CreateRoundDialog';
import { useAuthStore } from '@/stores/authStore';
import { useRounds, useCloseRound } from '@/hooks/useRounds';
import type { RoundSummary } from '@/services/api/rounds';

export default function AdminRoundsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: rounds = [], isLoading } = useRounds();
  const closeMut = useCloseRound();

  useEffect(() => {
    if (!authLoading && user && user.role !== 'admin') router.replace('/');
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  if (authLoading || !user || user.role !== 'admin') return null;

  async function handleClose(id: string) {
    if (!confirm('이 라운드를 마감하시겠습니까? 마감 후에는 응답을 받을 수 없습니다.')) return;
    try {
      await closeMut.mutateAsync(id);
    } catch (e: any) {
      alert(e?.message ?? '마감 실패');
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="mx-auto w-full max-w-5xl px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-[#1A1A1A]">
              <ListChecks className="size-6 text-[#2D7D7B]" />
              라운드 관리
            </h1>
            <p className="mt-1 text-sm text-[#6B6B7B]">
              분류 과제를 발급하고 결과를 확인합니다.
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-[#2D7D7B] text-white hover:bg-[#236968]"
          >
            <Plus className="size-4" />
            라운드 생성
          </Button>
        </div>

        {isLoading && <p className="text-sm text-[#9B9B9B]">로딩 중...</p>}
        {!isLoading && rounds.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#E8E5DE] p-8 text-center text-sm text-[#9B9B9B]">
            아직 생성된 라운드가 없습니다.
          </div>
        )}

        <div className="space-y-2">
          {rounds.map((r) => (
            <AdminRoundRow key={r.id} round={r} onClose={() => handleClose(r.id)} />
          ))}
        </div>
      </div>

      <CreateRoundDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function AdminRoundRow({
  round,
  onClose,
}: {
  round: RoundSummary;
  onClose: () => void;
}) {
  const isOpen = round.status === 'open';

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#E8E5DE] bg-white p-4 transition-colors hover:border-[#2D7D7B]/50">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium text-[#1A1A1A]">{round.title}</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              isOpen
                ? 'bg-[#2D7D7B]/10 text-[#2D7D7B]'
                : 'bg-[#9B9B9B]/10 text-[#9B9B9B]'
            }`}
          >
            {isOpen ? '진행 중' : '마감'}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-[#9B9B9B]">
          {round.creator.name} · {new Date(round.createdAt).toLocaleString('ko-KR')} ·{' '}
          문항 {round.itemCount}개
        </p>
      </div>

      {isOpen && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          className="text-[#E0845E] hover:bg-[#E0845E]/10 hover:text-[#E0845E]"
        >
          <Lock className="size-3.5" />
          마감
        </Button>
      )}

      <Link href={`/admin/rounds/${round.id}`}>
        <Button variant="outline" size="sm">
          결과
          <ChevronRight className="size-4" />
        </Button>
      </Link>
    </div>
  );
}
