// 사용자 목록 테이블 컴포넌트
'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EditUserDialog } from './EditUserDialog';
import { useDeleteUser } from '@/hooks/useUsers';
import type { User } from '@/types/user';

interface Props {
  users: User[];
  currentUserId: string;
}

/** 역할 뱃지 — admin: teal, member: 회색 */
function RoleBadge({ role }: { role: string }) {
  if (role === 'admin') {
    return <Badge className="bg-[#2D7D7B]/15 text-[#2D7D7B] hover:bg-[#2D7D7B]/20 border-0">관리자</Badge>;
  }
  return <Badge variant="secondary" className="bg-[#F0F0EA] text-[#6B6B7B] border-0">멤버</Badge>;
}

/** 인증 모드 뱃지 — subscription: 블루, api: 오렌지 */
function AuthModeBadge({ mode }: { mode: string }) {
  if (mode === 'subscription') {
    return <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-0">구독</Badge>;
  }
  return <Badge className="bg-orange-50 text-orange-600 hover:bg-orange-100 border-0">API 키</Badge>;
}

export function UserTable({ users, currentUserId }: Props) {
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const { mutateAsync: deleteUser, isPending: isDeleting } = useDeleteUser();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteUser(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <>
      <div className="rounded-xl border border-[#E8E5DE] bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E8E5DE] bg-[#F5F5EF]">
              <th className="px-4 py-3 text-left font-medium text-[#6B6B7B]">이름</th>
              <th className="px-4 py-3 text-left font-medium text-[#6B6B7B]">이메일</th>
              <th className="px-4 py-3 text-left font-medium text-[#6B6B7B]">역할</th>
              <th className="px-4 py-3 text-left font-medium text-[#6B6B7B]">인증 모드</th>
              <th className="px-4 py-3 text-left font-medium text-[#6B6B7B]">가입일</th>
              <th className="px-4 py-3 text-right font-medium text-[#6B6B7B]">작업</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-[#E8E5DE] last:border-0 hover:bg-[#F9F9F5] transition-colors">
                <td className="px-4 py-3 font-medium text-[#1A1A1A]">{user.name}</td>
                <td className="px-4 py-3 text-[#6B6B7B]">{user.email}</td>
                <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                <td className="px-4 py-3"><AuthModeBadge mode={user.authMode} /></td>
                <td className="px-4 py-3 text-[#6B6B7B]">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditTarget(user)} className="text-[#6B6B7B] hover:text-[#2D7D7B]">
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon-sm"
                      onClick={() => setDeleteTarget(user)}
                      disabled={user.id === currentUserId}
                      className="text-[#6B6B7B] hover:text-red-500 disabled:opacity-30"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="py-12 text-center text-[#6B6B7B]">등록된 사용자가 없습니다.</div>
        )}
      </div>

      {/* 수정 다이얼로그 */}
      <EditUserDialog user={editTarget} open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)} />

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사용자 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong>({deleteTarget?.email}) 사용자를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-500 hover:bg-red-600 text-white">
              {isDeleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
