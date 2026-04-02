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

  return { content, path: normalizedPath, language };
}

export const fileService = { readFile };
