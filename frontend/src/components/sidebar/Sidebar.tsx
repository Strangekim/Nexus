// 메인 사이드바 컴포넌트

'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
      <aside className="flex w-12 flex-col items-center border-r border-[#E8E5DE] bg-white py-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(false)}
          className="text-[#6B6B7B] hover:text-[#1A1A1A]"
        >
          <PanelLeft className="size-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-[#E8E5DE] bg-white">
      {/* 헤더: 로고 + 접기 버튼 */}
      <SidebarHeader onCollapse={() => setCollapsed(true)} />

      {/* 트리 영역 */}
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="px-2 py-1">
          <ProjectTree />
        </div>
      </ScrollArea>

      {/* 하단: 프로젝트 생성 버튼 */}
      <div className="border-t border-[#E8E5DE] p-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-[#6B6B7B] hover:bg-[#F5F5EF] hover:text-[#1A1A1A]"
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

/** 사이드바 헤더 — 가로형 로고 + 접기 토글 */
function SidebarHeader({ onCollapse }: { onCollapse: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-[#E8E5DE] px-3 py-3">
      {/* 로고 클릭 시 대시보드로 이동 */}
      <Link href="/" className="transition-opacity hover:opacity-80">
        <Image
          src="/logo.png"
          alt="Nexus"
          width={120}
          height={32}
          style={{ height: 'auto' }}
        />
      </Link>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onCollapse}
        className="text-[#6B6B7B] hover:text-[#1A1A1A]"
      >
        <PanelLeftClose className="size-4" />
      </Button>
    </div>
  );
}
