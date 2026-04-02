// 트리 아이템 — 프로젝트/폴더 공통 컴포넌트

'use client';

import { type ReactNode } from 'react';
import { ChevronRight, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useDeleteProject, useDeleteFolder } from '@/hooks/useProjectMutations';

interface TreeItemProps {
  icon: ReactNode;
  label: string;
  itemType: 'project' | 'folder';
  itemId: string;
  projectId?: string;
  actions?: ReactNode;
}

export function TreeItem({
  icon,
  label,
  itemType,
  itemId,
  projectId,
  actions,
}: TreeItemProps) {
  const deleteProject = useDeleteProject();
  const deleteFolder = useDeleteFolder();

  /** 삭제 핸들러 */
  const handleDelete = () => {
    if (itemType === 'project') {
      deleteProject.mutate(itemId);
    } else if (projectId) {
      deleteFolder.mutate({ projectId, id: itemId });
    }
  };

  return (
    <div className="group flex items-center">
      <CollapsibleTrigger className="flex flex-1 items-center gap-1 rounded-md px-1.5 py-1 text-sm hover:bg-white/5 cursor-pointer min-w-0">
        <ChevronRight
          className="size-3.5 shrink-0 transition-transform duration-200 [[data-open]>&]:rotate-90"
          style={{ color: '#6B6B7B' }}
        />
        <span className="shrink-0">{icon}</span>
        <span
          className="truncate"
          style={{ color: '#3D3D3D' }}
        >
          {label}
        </span>
      </CollapsibleTrigger>

      {/* 호버 시 표시되는 액션 버튼 */}
      <div className="hidden group-hover:flex items-center shrink-0">
        {actions}
        <ItemMenu onDelete={handleDelete} />
      </div>
    </div>
  );
}

/** 아이템 컨텍스트 메뉴 */
function ItemMenu({ onDelete }: { onDelete: () => void }) {
  return (
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
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="size-3.5" />
          삭제
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
