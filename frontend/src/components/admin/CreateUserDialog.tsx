// 사용자 추가 다이얼로그 컴포넌트
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateUser } from '@/hooks/useUsers';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** 초기 폼 상태 */
const INITIAL = {
  name: '',
  email: '',
  password: '',
  role: 'member' as 'admin' | 'member',
  linuxUser: '',
  authMode: 'subscription' as 'subscription' | 'api',
};

/** 네이티브 셀렉트 스타일 클래스 */
const selectClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

export function CreateUserDialog({ open, onOpenChange }: Props) {
  const [form, setForm] = useState(INITIAL);
  const [error, setError] = useState('');
  const { mutateAsync, isPending } = useCreateUser();

  /** 폼 필드 업데이트 */
  const set = (key: keyof typeof INITIAL, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /** 제출 처리 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await mutateAsync({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        authMode: form.authMode,
        ...(form.linuxUser && { linuxUser: form.linuxUser }),
      });
      setForm(INITIAL);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '사용자 생성 실패');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1A1A1A]">사용자 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cu-name">이름</Label>
            <Input id="cu-name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-email">이메일</Label>
            <Input id="cu-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-pw">비밀번호</Label>
            <Input id="cu-pw" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={6} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cu-role">역할</Label>
              <select
                id="cu-role"
                className={selectClass}
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
              >
                <option value="member">멤버</option>
                <option value="admin">관리자</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-auth">인증 모드</Label>
              <select
                id="cu-auth"
                className={selectClass}
                value={form.authMode}
                onChange={(e) => set('authMode', e.target.value)}
              >
                <option value="subscription">구독</option>
                <option value="api">API 키</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-linux">리눅스 사용자명 (선택)</Label>
            <Input id="cu-linux" value={form.linuxUser} onChange={(e) => set('linuxUser', e.target.value)} placeholder="예: john" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={isPending} className="bg-[#2D7D7B] hover:bg-[#236160] text-white">
              {isPending ? '생성 중...' : '추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
