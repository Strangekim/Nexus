// 프로젝트 생성 다이얼로그

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
import { useCreateProject } from '@/hooks/useProjectMutations';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: Props) {
  const [name, setName] = useState('');
  const [repoPath, setRepoPath] = useState('');
  const [description, setDescription] = useState('');
  const mutation = useCreateProject();

  /** 폼 초기화 */
  const resetForm = () => {
    setName('');
    setRepoPath('');
    setDescription('');
  };

  /** 제출 핸들러 */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !repoPath.trim()) return;
    mutation.mutate(
      { name: name.trim(), repoPath: repoPath.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E5DE' }}>
        <DialogHeader>
          <DialogTitle style={{ color: '#3D3D3D' }}>새 프로젝트</DialogTitle>
          <DialogDescription>프로젝트 정보를 입력하세요.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <FormField label="이름" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="프로젝트 이름"
              style={{ backgroundColor: '#F9F9F4', color: '#3D3D3D', borderColor: '#E8E5DE' }}
            />
          </FormField>
          <FormField label="저장소 경로" required>
            <Input
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="/home/ubuntu/projects/my-repo"
              style={{ backgroundColor: '#F9F9F4', color: '#3D3D3D', borderColor: '#E8E5DE' }}
            />
          </FormField>
          <FormField label="설명">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="프로젝트 설명 (선택)"
              style={{ backgroundColor: '#F9F9F4', color: '#3D3D3D', borderColor: '#E8E5DE' }}
            />
          </FormField>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || !name.trim() || !repoPath.trim()}>
              {mutation.isPending ? '생성 중...' : '생성'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** 폼 필드 래퍼 */
function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label style={{ color: '#3D3D3D' }}>
        {label}
        {required && <span style={{ color: '#E0845E' }}> *</span>}
      </Label>
      {children}
    </div>
  );
}
