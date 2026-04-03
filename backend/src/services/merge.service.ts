// Merge 서비스 — worktree 브랜치를 main에 merge
import { simpleGit } from 'simple-git';
import { mergeQueueService } from './merge-queue.service.js';

/** Merge 결과 */
export interface MergeResult {
  status: 'merged' | 'conflict';
}

/** Merge에 필요한 세션 정보 */
interface SessionLike {
  branchName: string | null;
  worktreePath?: string | null;
}

/** Merge에 필요한 프로젝트 정보 */
interface ProjectLike {
  id: string;
  repoPath: string;
}

class MergeService {
  /**
   * 세션 브랜치를 main에 merge
   * — mergeQueue를 통해 프로젝트 단위 직렬 실행
   * — 충돌 발생 시 git merge --abort 후 { status: 'conflict' } 반환
   * — AI 충돌 자동 해결은 향후 구현 예정
   * @param session 세션 (branchName 필요)
   * @param project 프로젝트 (id, repoPath 필요)
   */
  async mergeSessionToMain(session: SessionLike, project: ProjectLike): Promise<MergeResult> {
    if (!session.branchName) {
      // branchName이 없는 세션(프로젝트 직속)은 merge 불필요
      return { status: 'merged' };
    }

    return mergeQueueService.executeMerge(project.id, async () => {
      const git = simpleGit(project.repoPath);

      // worktree에 uncommitted 변경이 있으면 자동 커밋
      if (session.worktreePath) {
        const wtGit = simpleGit(session.worktreePath);
        const status = await wtGit.status();
        if (status.files.length > 0) {
          await wtGit.add('.');
          await wtGit.commit('자동 커밋 — merge 전 미커밋 변경사항 저장');
        }
      }

      // 기본 브랜치 감지 (main 또는 master)
      const branches = await git.branchLocal();
      const defaultBranch = branches.all.includes('main') ? 'main' : 'master';

      // 기본 브랜치로 체크아웃
      await git.checkout(defaultBranch);

      try {
        // 세션 브랜치를 main에 merge
        await git.merge([session.branchName!]);
        return { status: 'merged' as const };
      } catch {
        // 충돌 발생 — merge 취소 후 conflict 반환
        await git.raw(['merge', '--abort']).catch(() => null);
        return { status: 'conflict' as const };
      }
    });
  }
}

// 싱글턴 인스턴스 export
export const mergeService = new MergeService();
