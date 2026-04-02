// 세션 아이템 — 트리 리프 노드

'use client';

import { useRouter, usePathname } from 'next/navigation';
import { MessageSquare, MessageCircle, Lock, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useDeleteSession } from '@/hooks/useProjectMutations';
import type { TreeSession } from '@/types/project';

interface SessionItemProps {
  session: TreeSession;
  projectId: string;
  /** 폴더 없이 프로젝트에 직속된 세션 여부 (전반 논의/질문용) */
  isProjectDirect?: boolean;
}

export function SessionItem({ session, projectId, isProjectDirect = false }: SessionItemProps) {
  const router = useRouter();
  const pathname = usePathname();
  const deleteSession = useDeleteSession();

  const href = `/projects/${projectId}/sessions/${session.id}`;
  const isActive = pathname === href;

  /** 세션 클릭 — 세션 페이지로 이동 */
  const handleClick = () => {
    router.push(href);
  };

  // 프로젝트 직속 세션: MessageCircle + coral, 폴더 하위 세션: MessageSquare + teal
  const SessionIcon = isProjectDirect ? MessageCircle : MessageSquare;
  const iconColor = isProjectDirect ? '#E0845E' : '#2D7D7B';

  return (
    <div className="group flex items-center">
      <button
        onClick={handleClick}
        className="flex flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-sm cursor-pointer min-w-0 text-left"
        style={{
          backgroundColor: isActive ? 'rgba(45,125,123,0.2)' : undefined,
          color: '#3D3D3D',
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <SessionIcon className="size-3.5 shrink-0" style={{ color: iconColor }} />
        <span className="truncate">{session.title}</span>
        {session.lockedBy && (
          <Lock className="size-3 shrink-0" style={{ color: '#E0845E' }} />
        )}
      </button>

      {/* 호버 시 메뉴 */}
      <div className="hidden group-hover:flex items-center shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-xs" style={{ color: '#6B6B7B' }} />
            }
          >
            <MoreHorizontal className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuItem disabled>
              <Pencil className="size-3.5" />
              이름 변경
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => deleteSession.mutate(session.id)}
            >
              <Trash2 className="size-3.5" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
