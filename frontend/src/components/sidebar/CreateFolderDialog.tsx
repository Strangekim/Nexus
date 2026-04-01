// 폴더 생성 다이얼로그

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
import { useCreateFolder } from '@/hooks/useProjectMutations';

interface Props {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFolderDialog({ projectId, open, onOpenChange }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const mutation = useCreateFolder();

  /** 제출 핸들러 */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    mutation.mutate(
      { projectId, data: { name: name.trim(), description: description.trim() || undefined } },
      {
        onSuccess: () => {
          setName('');
          setDescription('');
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ backgroundColor: '#16213E', borderColor: '#2A2A3E' }}>
        <DialogHeader>
          <DialogTitle style={{ color: '#E8E8ED' }}>새 폴더</DialogTitle>
          <DialogDescription>폴더 정보를 입력하세요.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label style={{ color: '#E8E8ED' }}>
              이름<span style={{ color: '#E0845E' }}> *</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="폴더 이름"
              style={{ backgroundColor: '#1E1E32', color: '#E8E8ED', borderColor: '#2A2A3E' }}
            />
          </div>
          <div className="space-y-1.5">
            <Label style={{ color: '#E8E8ED' }}>설명</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="폴더 설명 (선택)"
              style={{ backgroundColor: '#1E1E32', color: '#E8E8ED', borderColor: '#2A2A3E' }}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || !name.trim()}>
              {mutation.isPending ? '생성 중...' : '생성'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
