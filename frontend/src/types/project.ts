// 프로젝트/폴더/세션 타입 정의

/** 프로젝트 */
export interface Project {
  id: string;
  name: string;
  repoPath: string;
  description?: string;
  /** 관리자 전용 프로젝트 여부 */
  isAdminOnly?: boolean;
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
  /** 폴더에 속하지 않는 경우 null */
  folderId: string | null;
  claudeSessionId?: string;
  title: string;
  status: 'active' | 'archived';
  /** 백엔드 Prisma include 응답의 관계명: locker */
  locker?: { id: string; name: string } | null;
  lockedAt?: string | null;
  /** 백엔드 Prisma include 응답의 관계명: creator */
  creator?: { id: string; name: string } | null;
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
  /** 관리자 전용 프로젝트 여부 */
  isAdminOnly?: boolean;
  folders: TreeFolder[];
  /** 폴더에 속하지 않는 프로젝트 직속 세션 */
  sessions: TreeSession[];
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
