// 메인 사이드바 컴포넌트

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PanelLeftClose, PanelLeft, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ProjectTree } from './ProjectTree';
import { CreateProjectDialog } from './CreateProjectDialog';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  if (collapsed) {
    return (
      <aside
        className="flex flex-col items-center py-3 border-r"
        style={{ backgroundColor: '#0F3433', borderColor: '#2A2A3E', width: 48 }}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(false)}
          style={{ color: '#8B8B9E' }}
        >
          <PanelLeft className="size-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside
      className="flex flex-col w-64 border-r shrink-0"
      style={{ backgroundColor: '#0F3433', borderColor: '#2A2A3E' }}
    >
      {/* 헤더: 로고 + 접기 버튼 */}
      <SidebarHeader onCollapse={() => setCollapsed(true)} />

      {/* 트리 영역 */}
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="px-2 py-1">
          <ProjectTree />
        </div>
      </ScrollArea>

      {/* 하단: 프로젝트 생성 버튼 */}
      <div className="p-2 border-t" style={{ borderColor: '#2A2A3E' }}>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          style={{ color: '#8B8B9E' }}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
          새 프로젝트
        </Button>
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </aside>
  );
}

/** 사이드바 헤더 — 로고 + 접기 토글 */
function SidebarHeader({ onCollapse }: { onCollapse: () => void }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-3 border-b"
      style={{ borderColor: '#2A2A3E' }}
    >
      <div className="flex items-center gap-2">
        <Image src="/logo.png" alt="Nexus" width={28} height={28} />
        <span
          className="text-sm font-semibold tracking-wide"
          style={{ color: '#E8E8ED' }}
        >
          Nexus
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onCollapse}
        style={{ color: '#8B8B9E' }}
      >
        <PanelLeftClose className="size-4" />
      </Button>
    </div>
  );
}
