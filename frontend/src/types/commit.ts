// 커밋 관련 타입 정의

/** 커밋 목록 아이템 */
export interface Commit {
  id: string;
  projectId: string;
  sessionId?: string | null;
  hash: string;
  message: string;
  author: string;
  email?: string;
  additions: number;
  deletions: number;
  filesChanged: string[];
  committedAt: string;
  createdAt: string;
  session?: {
    id: string;
    title: string;
  } | null;
}

/** 커밋 목록 조회 응답 */
export interface CommitListResponse {
  commits: Commit[];
  total: number;
  page: number;
  limit: number;
}

/** Diff 파일 한 줄 */
export interface DiffLine {
  type: 'context' | 'addition' | 'deletion' | 'header';
  content: string;
  oldLineNo?: number;
  newLineNo?: number;
}

/** 파일별 Diff */
export interface FileDiff {
  oldPath: string;
  newPath: string;
  additions: number;
  deletions: number;
  lines: DiffLine[];
}

/** 커밋 Diff 응답 */
export interface CommitDiffResponse {
  hash: string;
  message: string;
  author: string;
  committedAt: string;
  additions: number;
  deletions: number;
  files: FileDiff[];
}

/** Revert 응답 */
export interface RevertResponse {
  revertHash: string;
  message: string;
}
