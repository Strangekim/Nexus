// 세션 생성 다이얼로그

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCreateSession } from '@/hooks/useProjectMutations';

interface Props {
  folderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSessionDialog({ folderId, open, onOpenChange }: Props) {
  const [title, setTitle] = useState('');
  const mutation = useCreateSession();

  /** 제출 핸들러 */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    mutation.mutate(
      { folderId, title: title.trim() },
      {
        onSuccess: () => {
          setTitle('');
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ backgroundColor: '#16213E', borderColor: '#2A2A3E' }}>
        <DialogHeader>
          <DialogTitle style={{ color: '#E8E8ED' }}>새 세션</DialogTitle>
          <DialogDescription>세션 제목을 입력하세요.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label style={{ color: '#E8E8ED' }}>
              제목<span style={{ color: '#E0845E' }}> *</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="세션 제목"
              style={{ backgroundColor: '#1E1E32', color: '#E8E8ED', borderColor: '#2A2A3E' }}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || !title.trim()}>
              {mutation.isPending ? '생성 중...' : '생성'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
