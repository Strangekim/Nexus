// 파일 내용 읽기 서비스 — 코드 뷰어용
import fs from 'node:fs/promises';
import path from 'node:path';
import prisma from '../lib/prisma.js';
import { createHttpError } from '../lib/errors.js';

/** 확장자 → 언어 ID 매핑 */
const EXT_LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescriptreact',
  js: 'javascript',
  jsx: 'javascriptreact',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  rs: 'rust',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  rb: 'ruby',
  php: 'php',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  json: 'json',
  jsonc: 'jsonc',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  svg: 'xml',
  md: 'markdown',
  mdx: 'mdx',
  sh: 'shellscript',
  bash: 'shellscript',
  zsh: 'shellscript',
  fish: 'shellscript',
  sql: 'sql',
  graphql: 'graphql',
  gql: 'graphql',
  prisma: 'prisma',
  dockerfile: 'dockerfile',
  tf: 'terraform',
  vue: 'vue',
  svelte: 'svelte',
  env: 'plaintext',
  txt: 'plaintext',
  log: 'plaintext',
};

/** 파일 확장자로 언어 ID 추론 */
function detectLanguage(filePath: string): string {
  const basename = path.basename(filePath).toLowerCase();

  // 확장자 없는 특수 파일 처리
  if (basename === 'dockerfile') return 'dockerfile';
  if (basename === 'makefile') return 'makefile';
  if (basename === '.gitignore' || basename === '.npmignore') return 'gitignore';
  if (basename === '.env' || basename.startsWith('.env.')) return 'plaintext';

  const ext = path.extname(filePath).slice(1).toLowerCase();
  return EXT_LANGUAGE_MAP[ext] ?? 'plaintext';
}

/** 민감 파일 차단 패턴 목록 */
const BLOCKED_PATTERNS = [
  /\.env($|\.)/,        // .env, .env.local, .env.production 등
  /\.git\//,            // .git 디렉토리 내부
  /\.git$/,             // .git 파일
  /id_rsa/,             // SSH 비공개 키
  /\.pem$/,             // 인증서/키 파일
  /\.key$/,             // 비공개 키 파일
  /credentials/i,       // 자격증명 파일
  /secrets?\./i,        // 시크릿 파일
];

/** 파일 내용 읽기 — 경로 트래버설 방어 및 민감 파일 차단 포함 */
async function readFile(projectId: string, relativePath: string) {
  // 프로젝트 조회
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { repoPath: true },
  });

  if (!project) {
    throw createHttpError(404, '프로젝트를 찾을 수 없습니다', { code: 'PROJECT_NOT_FOUND' });
  }

  const repoPath = path.resolve(project.repoPath);
  // 경로 트래버설 방어: resolve 후 repoPath 하위인지 확인
  const absolutePath = path.resolve(repoPath, relativePath);

  if (!absolutePath.startsWith(repoPath + path.sep) && absolutePath !== repoPath) {
    throw createHttpError(403, '허용되지 않는 파일 경로입니다', { code: 'FORBIDDEN_PATH' });
  }

  // 민감 파일 차단: 상대 경로 및 파일명 기준으로 패턴 검사
  const normalizedRelative = relativePath.replace(/\\/g, '/');
  const isSensitive = BLOCKED_PATTERNS.some((pattern) => pattern.test(normalizedRelative));
  if (isSensitive) {
    throw createHttpError(403, '접근이 차단된 파일입니다', { code: 'FORBIDDEN_PATH' });
  }

  // 파일 존재 여부 및 타입 확인
  let stat;
  try {
    stat = await fs.stat(absolutePath);
  } catch {
    throw createHttpError(404, '파일을 찾을 수 없습니다', { code: 'FILE_NOT_FOUND' });
  }

  if (!stat.isFile()) {
    throw createHttpError(400, '디렉토리는 읽을 수 없습니다', { code: 'IS_DIRECTORY' });
  }

  // 파일 크기 제한 (5MB)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (stat.size > MAX_SIZE) {
    throw createHttpError(413, '파일 크기가 너무 큽니다 (최대 5MB)', { code: 'FILE_TOO_LARGE' });
  }

  const content = await fs.readFile(absolutePath, 'utf-8');
  const language = detectLanguage(absolutePath);
  // repoPath 기준 상대 경로로 변환
  const normalizedPath = path.relative(repoPath, absolutePath);

  // mtime을 ms 단위로 반환 — 저장 시 충돌 감지에 사용
  return { content, path: normalizedPath, language, mtime: stat.mtimeMs };
}

/** 파일 내용 저장 — readFile과 동일한 보안 검증 + 선택적 mtime 충돌 감지 */
async function saveFile(
  projectId: string,
  relativePath: string,
  content: string,
  expectedMtime?: number,
) {
  // 프로젝트 조회
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { repoPath: true },
  });

  if (!project) {
    throw createHttpError(404, '프로젝트를 찾을 수 없습니다', { code: 'PROJECT_NOT_FOUND' });
  }

  const repoPath = path.resolve(project.repoPath);
  // 경로 트래버설 방어: resolve 후 repoPath 하위인지 확인
  const absolutePath = path.resolve(repoPath, relativePath);

  if (!absolutePath.startsWith(repoPath + path.sep) && absolutePath !== repoPath) {
    throw createHttpError(403, '허용되지 않는 파일 경로입니다', { code: 'FORBIDDEN_PATH' });
  }

  // 민감 파일 차단: 상대 경로 및 파일명 기준으로 패턴 검사
  const normalizedRelative = relativePath.replace(/\\/g, '/');
  const isSensitive = BLOCKED_PATTERNS.some((pattern) => pattern.test(normalizedRelative));
  if (isSensitive) {
    throw createHttpError(403, '접근이 차단된 파일입니다', { code: 'FORBIDDEN_PATH' });
  }

  // 충돌 감지 — expectedMtime이 전달됐고 파일이 존재하면 현재 mtime과 비교
  if (expectedMtime !== undefined) {
    try {
      const currentStat = await fs.stat(absolutePath);
      // 1초 여유 — 파일시스템 시간 해상도 차이 감안
      if (Math.abs(currentStat.mtimeMs - expectedMtime) > 1000) {
        throw createHttpError(409, '파일이 외부에서 수정되었습니다. 다시 불러오세요.', {
          code: 'CONFLICT',
        });
      }
    } catch (err) {
      const error = err as { code?: string; statusCode?: number };
      // CONFLICT 에러는 그대로 전파
      if (error.statusCode === 409) throw err;
      // 파일이 존재하지 않으면 새 파일 생성으로 간주 — 통과
    }
  }

  // 파일 쓰기 (디렉토리가 존재하지 않으면 재귀 생성)
  const dir = path.dirname(absolutePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(absolutePath, content, 'utf-8');

  // 저장된 파일 정보 반환
  const stat = await fs.stat(absolutePath);
  const language = detectLanguage(absolutePath);
  const normalizedPath = path.relative(repoPath, absolutePath);

  return { path: normalizedPath, language, size: stat.size, mtime: stat.mtimeMs };
}

/** 디렉토리 내용 브라우징 — 파일/폴더 목록 반환 */
async function browseDirectory(projectId: string, relativePath: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { repoPath: true },
  });

  if (!project) {
    throw createHttpError(404, '프로젝트를 찾을 수 없습니다', { code: 'PROJECT_NOT_FOUND' });
  }

  const repoPath = path.resolve(project.repoPath);
  const absolutePath = path.resolve(repoPath, relativePath || '.');

  // 경로 트래버설 방어
  if (!absolutePath.startsWith(repoPath + path.sep) && absolutePath !== repoPath) {
    throw createHttpError(403, '허용되지 않는 경로입니다', { code: 'FORBIDDEN_PATH' });
  }

  let stat;
  try {
    stat = await fs.stat(absolutePath);
  } catch {
    throw createHttpError(404, '디렉토리를 찾을 수 없습니다', { code: 'NOT_FOUND' });
  }

  if (!stat.isDirectory()) {
    throw createHttpError(400, '디렉토리가 아닙니다', { code: 'NOT_DIRECTORY' });
  }

  const entries = await fs.readdir(absolutePath, { withFileTypes: true });

  // 숨김 파일/민감 디렉토리 필터링 + 정렬 (폴더 먼저, 알파벳 순)
  const filtered = entries.filter((e) => {
    // node_modules, .git 등 숨기기
    if (e.name === 'node_modules' || e.name === '.git' || e.name === '.next' || e.name === 'dist') return false;
    return true;
  });

  const items = filtered.map((e) => {
    const childPath = path.relative(repoPath, path.join(absolutePath, e.name));
    return {
      name: e.name,
      path: childPath,
      type: e.isDirectory() ? 'directory' as const : 'file' as const,
    };
  });

  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const currentPath = path.relative(repoPath, absolutePath);
  return { path: currentPath, items };
}

export const fileService = { readFile, saveFile, browseDirectory };
