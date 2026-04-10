// 라운드 생성 다이얼로그 (관리자)
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateRound } from '@/hooks/useRounds';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const selectClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

export function CreateRoundDialog({ open, onOpenChange }: Props) {
  const [title, setTitle] = useState('');
  const [count, setCount] = useState(10);
  const [strategy, setStrategy] = useState<'random' | 'sparse_category'>('random');
  const [excludeGoldSet, setExcludeGoldSet] = useState(true);
  const [error, setError] = useState('');
  const { mutateAsync, isPending } = useCreateRound();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('제목을 입력해 주세요');
      return;
    }
    if (count < 1 || count > 200) {
      setError('문항 수는 1~200 사이여야 합니다');
      return;
    }
    try {
      await mutateAsync({ title: title.trim(), count, strategy, excludeGoldSet });
      // 폼 초기화 후 닫기
      setTitle('');
      setCount(10);
      setStrategy('random');
      setExcludeGoldSet(true);
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message ?? '생성 실패');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>라운드 생성</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="round-title">제목</Label>
            <Input
              id="round-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 2026-04-10 일일 분류 과제"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="round-count">문항 수 (1~200)</Label>
            <Input
              id="round-count"
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value || '0', 10))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="round-strategy">샘플링 전략</Label>
            <select
              id="round-strategy"
              className={selectClass}
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as typeof strategy)}
            >
              <option value="random">랜덤</option>
              <option value="sparse_category">희소 카테고리 우선</option>
            </select>
            <p className="text-xs text-[#9B9B9B]">
              희소 카테고리 우선: 골드셋이 적은 분류를 먼저 채웁니다.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-[#1A1A1A]">
            <input
              type="checkbox"
              checked={excludeGoldSet}
              onChange={(e) => setExcludeGoldSet(e.target.checked)}
              className="size-4 accent-[#2D7D7B]"
            />
            이미 골드셋에 등록된 오디오 제외
          </label>

          {error && <p className="text-xs text-[#E0845E]">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[#2D7D7B] text-white hover:bg-[#236968]"
            >
              {isPending ? '생성 중...' : '생성'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
