// Git 커밋 동기화 서비스 — worktree에서 새 커밋을 읽어 DB에 동기화
import { simpleGit } from 'simple-git';
import prisma from '../lib/prisma.js';
import { socketService } from './socket.service.js';
import { createHttpError } from '../lib/errors.js';

/** 커밋 단건 파싱 결과 */
interface CommitStatResult {
  filesChanged: string[];
  additions: number;
  deletions: number;
}

/** git diff-tree로 변경 파일 및 통계 추출 */
async function extractCommitStat(
  repoPath: string,
  hash: string,
): Promise<CommitStatResult> {
  const git = simpleGit(repoPath);
  try {
    // 변경 파일 목록
    const filesRaw = await git.raw([
      'diff-tree', '--no-commit-id', '--name-only', '-r', hash,
    ]);
    const filesChanged = filesRaw.trim().split('\n').filter(Boolean);

    // 추가/삭제 라인 수
    const statRaw = await git.raw([
      'diff-tree', '--no-commit-id', '--numstat', '-r', hash,
    ]);
    let additions = 0;
    let deletions = 0;
    for (const line of statRaw.trim().split('\n').filter(Boolean)) {
      const [add, del] = line.split('\t');
      additions += parseInt(add, 10) || 0;
      deletions += parseInt(del, 10) || 0;
    }
    return { filesChanged, additions, deletions };
  } catch {
    // 머지 커밋 등 diff-tree 실패 시 기본값 반환
    return { filesChanged: [], additions: 0, deletions: 0 };
  }
}

class CommitSyncService {
  /**
   * worktree의 새 커밋을 DB에 동기화하고 WebSocket으로 브로드캐스트
   * @param projectId 프로젝트 ID
   * @param sessionId 세션 ID (nullable)
   * @param worktreePath worktree 절대 경로
   */
  async syncNewCommits(
    projectId: string,
    sessionId: string | null,
    worktreePath: string,
  ): Promise<void> {
    const git = simpleGit(worktreePath);

    // DB에서 마지막 동기화된 커밋 조회
    const lastCommit = await prisma.commit.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    // git log 조회 — 마지막 커밋 이후 또는 전체
    let logArgs: string[];
    if (lastCommit?.hash) {
      logArgs = [`${lastCommit.hash}..HEAD`];
    } else {
      logArgs = ['HEAD'];
    }

    let log;
    try {
      log = await git.log(logArgs);
    } catch {
      // 커밋이 없는 저장소 등 예외 무시
      return;
    }

    if (!log.all.length) return;

    // 새 커밋을 DB에 upsert 후 WebSocket 브로드캐스트
    for (const entry of [...log.all].reverse()) {
      const stat = await extractCommitStat(worktreePath, entry.hash);

      const saved = await prisma.commit.upsert({
        where: { projectId_hash: { projectId, hash: entry.hash } },
        create: {
          projectId,
          sessionId: sessionId ?? undefined,
          hash: entry.hash,
          message: entry.message,
          author: entry.author_name,
          filesChanged: stat.filesChanged,
          additions: stat.additions,
          deletions: stat.deletions,
          createdAt: new Date(entry.date),
        },
        update: {},
      });

      socketService.emitToProject(projectId, 'git:commit-new', {
        id: saved.id,
        projectId: saved.projectId,
        sessionId: saved.sessionId,
        hash: saved.hash,
        message: saved.message,
        author: saved.author,
        filesChanged: saved.filesChanged,
        additions: saved.additions,
        deletions: saved.deletions,
        createdAt: saved.createdAt,
      });
    }
  }

  /**
   * 특정 커밋의 diff를 파일별로 파싱하여 반환
   * @param repoPath 저장소 경로
   * @param hash 커밋 해시
   */
  async getCommitDiff(
    repoPath: string,
    hash: string,
  ): Promise<{ filename: string; diff: string }[]> {
    const git = simpleGit(repoPath);
    const raw = await git.diff([`${hash}^`, hash]);
    return parseDiffByFile(raw);
  }

  /**
   * 커밋을 revert하고 새 커밋을 동기화
   * @param projectId 프로젝트 ID
   * @param repoPath 저장소 경로
   * @param hash revert 대상 커밋 해시
   */
  async revertCommit(
    projectId: string,
    repoPath: string,
    hash: string,
  ): Promise<void> {
    const git = simpleGit(repoPath);
    try {
      // --no-edit: 에디터 없이 기본 revert 커밋 메시지 사용
      await git.raw(['revert', '--no-edit', hash]);
    } catch (err) {
      // 충돌 발생 시 abort 후 409 에러
      await git.raw(['revert', '--abort']).catch(() => null);
      throw createHttpError(409, '충돌로 인해 revert를 수행할 수 없습니다');
    }

    // revert 커밋 동기화
    await this.syncNewCommits(projectId, null, repoPath);
  }
}

/** unified diff 문자열을 파일별로 분리 */
function parseDiffByFile(raw: string): { filename: string; diff: string }[] {
  const results: { filename: string; diff: string }[] = [];
  const fileSections = raw.split(/^diff --git /m).filter(Boolean);
  for (const section of fileSections) {
    const match = section.match(/^a\/(.+?) b\//);
    const filename = match ? match[1] : 'unknown';
    results.push({ filename, diff: `diff --git ${section}` });
  }
  return results;
}

export const commitSyncService = new CommitSyncService();
