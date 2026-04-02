// 롤백 버튼 + 확인 다이얼로그 — base-ui Dialog 기반

'use client';

import { useState } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useRevertCommit } from '@/hooks/useCommits';
import { useRouter } from 'next/navigation';

interface RevertButtonProps {
  projectId: string;
  hash: string;
  message: string;
}

export function RevertButton({ projectId, hash, message }: RevertButtonProps) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const revert = useRevertCommit(projectId);

  const handleRevert = async () => {
    try {
      await revert.mutateAsync(hash);
      setResult('success');
      setTimeout(() => {
        setOpen(false);
        setResult('idle');
        router.push(`/projects/${projectId}/commits`);
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '롤백 실패';
      setErrorMsg(msg);
      setResult('error');
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 border-[#E8E5DE] text-[#6B6B7B] hover:border-[#dc2626] hover:text-[#dc2626]"
      >
        <RotateCcw size={14} />
        롤백
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1A1A1A]">
              <AlertTriangle size={18} className="text-[#E0845E]" />
              커밋 롤백 확인
            </DialogTitle>
            <DialogDescription>
              다음 커밋의 변경사항을 되돌리는 새 커밋이 생성됩니다.
              기존 커밋은 삭제되지 않습니다.
            </DialogDescription>
          </DialogHeader>

          {/* 대상 커밋 */}
          <div className="rounded-lg bg-[#F5F5EF] border border-[#E8E5DE] px-3 py-2 my-2">
            <code className="text-xs text-[#6B6B7B] font-mono">{hash.slice(0, 7)}</code>
            <p className="text-sm font-medium text-[#1A1A1A] mt-0.5 truncate">{message}</p>
          </div>

          {/* 결과 피드백 */}
          {result === 'success' && (
            <p className="text-sm text-[#16a34a] font-medium">롤백 완료! 새 커밋이 생성되었습니다.</p>
          )}
          {result === 'error' && (
            <p className="text-sm text-[#dc2626]">{errorMsg}</p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={revert.isPending}
            >
              취소
            </Button>
            <Button
              onClick={handleRevert}
              disabled={revert.isPending || result === 'success'}
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            >
              {revert.isPending ? '롤백 중...' : '롤백 확인'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
