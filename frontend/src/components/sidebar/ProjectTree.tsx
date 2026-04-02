// 프로젝트 트리 — 프로젝트/폴더/세션 렌더링

'use client';

import { useState } from 'react';
import { FolderKanban, Folder, Plus, FolderPlus, MessageSquarePlus } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { useTree } from '@/hooks/useTree';
import { TreeItem } from './TreeItem';
import { SessionItem } from './SessionItem';
import { CreateFolderDialog } from './CreateFolderDialog';
import { CreateSessionDialog } from './CreateSessionDialog';
import type { TreeProject, TreeFolder } from '@/types/project';

export function ProjectTree() {
  const { data: tree, isLoading } = useTree();

  if (isLoading) {
    return (
      <div className="px-2 py-4 text-xs" style={{ color: '#6B6B7B' }}>
        불러오는 중...
      </div>
    );
  }

  if (!tree || tree.length === 0) {
    return (
      <div className="px-2 py-4 text-xs" style={{ color: '#6B6B7B' }}>
        프로젝트가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {tree.map((project) => (
        <ProjectNode key={project.id} project={project} />
      ))}
    </div>
  );
}

/** 프로젝트 노드 — 접을 수 있는 트리 항목 */
function ProjectNode({ project }: { project: TreeProject }) {
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);

  return (
    <Collapsible defaultOpen>
      <TreeItem
        icon={<FolderKanban className="size-4" style={{ color: '#2D7D7B' }} />}
        label={project.name}
        itemType="project"
        itemId={project.id}
        actions={
          <div className="flex gap-0.5">
            <Button
              variant="ghost"
              size="icon-xs"
              title="폴더 추가"
              onClick={(e) => { e.stopPropagation(); setFolderDialogOpen(true); }}
              style={{ color: '#6B6B7B' }}
            >
              <FolderPlus className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              title="세션 추가"
              onClick={(e) => { e.stopPropagation(); setSessionDialogOpen(true); }}
              style={{ color: '#6B6B7B' }}
            >
              <MessageSquarePlus className="size-3" />
            </Button>
          </div>
        }
      />
      <CollapsibleContent>
        <div className="ml-3 border-l" style={{ borderColor: '#E8E5DE' }}>
          {/* 폴더 목록 */}
          {project.folders.map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              projectId={project.id}
            />
          ))}
          {/* 프로젝트 직속 세션 목록 — 전반 논의/질문용, coral 아이콘으로 구분 */}
          {project.sessions?.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              projectId={project.id}
              isProjectDirect
            />
          ))}
        </div>
      </CollapsibleContent>
      <CreateFolderDialog
        projectId={project.id}
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
      />
      <CreateSessionDialog
        projectId={project.id}
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
      />
    </Collapsible>
  );
}

/** 폴더 노드 — 접을 수 있는 트리 항목 */
function FolderNode({ folder, projectId }: { folder: TreeFolder; projectId: string }) {
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);

  return (
    <Collapsible defaultOpen>
      <TreeItem
        icon={<Folder className="size-4" style={{ color: '#E0845E' }} />}
        label={folder.name}
        itemType="folder"
        itemId={folder.id}
        projectId={projectId}
        actions={
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => { e.stopPropagation(); setSessionDialogOpen(true); }}
            style={{ color: '#6B6B7B' }}
          >
            <Plus className="size-3" />
          </Button>
        }
      />
      <CollapsibleContent>
        <div className="ml-5 border-l pl-2" style={{ borderColor: '#E0845E33' }}>
          {folder.sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              projectId={projectId}
            />
          ))}
        </div>
      </CollapsibleContent>
      <CreateSessionDialog
        projectId={projectId}
        folderId={folder.id}
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
      />
    </Collapsible>
  );
}
