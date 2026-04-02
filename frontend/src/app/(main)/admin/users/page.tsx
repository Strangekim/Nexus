// 사용자 관리 페이지 — 관리자 전용
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserTable } from '@/components/admin/UserTable';
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import { useAuthStore } from '@/stores/authStore';
import { useUsers } from '@/hooks/useUsers';

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: users = [], isLoading } = useUsers();

  // 비관리자 접근 시 홈으로 리다이렉트
  useEffect(() => {
    if (!authLoading && user && user.role !== 'admin') {
      router.replace('/');
    }
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  // 인증 로딩 중이거나 비관리자인 경우 렌더링 제외
  if (authLoading || !user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A1A1A]">사용자 관리</h1>
          <p className="mt-1 text-sm text-[#6B6B7B]">팀원을 추가하고 역할·인증 모드를 관리합니다.</p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="gap-2 bg-[#2D7D7B] hover:bg-[#236160] text-white"
        >
          <UserPlus className="size-4" />
          사용자 추가
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="전체 사용자" value={users.length} color="teal" />
        <StatCard label="관리자" value={users.filter((u) => u.role === 'admin').length} color="teal" />
        <StatCard label="API 키 모드" value={users.filter((u) => u.authMode === 'api').length} color="coral" />
      </div>

      {/* 사용자 테이블 */}
      {isLoading ? (
        <div className="py-16 text-center text-[#6B6B7B] text-sm">불러오는 중...</div>
      ) : (
        <UserTable users={users} currentUserId={user.id} />
      )}

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

/** 통계 카드 컴포넌트 */
function StatCard({ label, value, color }: { label: string; value: number; color: 'teal' | 'coral' }) {
  const accent = color === 'teal' ? 'text-[#2D7D7B]' : 'text-[#E0845E]';
  return (
    <div className="rounded-xl border border-[#E8E5DE] bg-white px-5 py-4">
      <p className="text-xs text-[#6B6B7B]">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}
