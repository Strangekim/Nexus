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
  projectId: string;
  folderId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** 세션 생성 — folderId 또는 projectId 중 하나를 전달 */
export function CreateSessionDialog({ folderId, projectId, open, onOpenChange }: Props) {
  const [title, setTitle] = useState('');
  const mutation = useCreateSession();

  /** 제출 핸들러 */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    mutation.mutate(
      { folderId, projectId, title: title.trim() },
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
      <DialogContent style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E5DE' }}>
        <DialogHeader>
          <DialogTitle style={{ color: '#3D3D3D' }}>새 세션</DialogTitle>
          <DialogDescription>세션 제목을 입력하세요.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label style={{ color: '#3D3D3D' }}>
              제목<span style={{ color: '#E0845E' }}> *</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="세션 제목"
              style={{ backgroundColor: '#F9F9F4', color: '#3D3D3D', borderColor: '#E8E5DE' }}
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
