// 프로젝트/폴더/세션 타입 정의

/** 프로젝트 */
export interface Project {
  id: string;
  name: string;
  repoPath: string;
  description?: string;
  createdAt: string;
}

/** 폴더 */
export interface Folder {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  createdAt: string;
}

/** 세션 */
export interface Session {
  id: string;
  folderId: string;
  claudeSessionId?: string;
  title: string;
  status: 'active' | 'archived';
  lockedBy?: { id: string; name: string } | null;
  lockedAt?: string | null;
  createdBy?: { id: string; name: string } | null;
  worktreePath?: string;
  branchName?: string;
  mergeStatus: 'working' | 'merged' | 'conflict';
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** 사이드바 트리 — 프로젝트 노드 */
export interface TreeProject {
  id: string;
  name: string;
  type: 'project';
  folders: TreeFolder[];
}

/** 사이드바 트리 — 폴더 노드 */
export interface TreeFolder {
  id: string;
  name: string;
  type: 'folder';
  sessions: TreeSession[];
}

/** 사이드바 트리 — 세션 노드 */
export interface TreeSession {
  id: string;
  title: string;
  status: 'active' | 'archived';
  lockedBy: { id: string; name: string } | null;
  type: 'session';
}
