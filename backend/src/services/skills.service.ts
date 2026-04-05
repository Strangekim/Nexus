// Skills 디렉토리 서비스 — .claude/skills/<name>/SKILL.md 파일 관리
// 활성: .claude/skills/, 비활성: .claude/skills-disabled/
import { readFile, writeFile, mkdir, rm, readdir, stat, rename } from 'fs/promises';
import { join } from 'path';
import { createHttpError } from '../lib/errors.js';

const SKILLS_DIR = '.claude/skills';
const DISABLED_DIR = '.claude/skills-disabled';

/** 스킬 메타 + 활성 상태 */
export interface SkillSummary {
  name: string;
  description: string;
  enabled: boolean;
}

/** 스킬 이름 검증 — path traversal 방어 */
function validateSkillName(name: string): void {
  if (!name || name.length > 100) {
    throw createHttpError(400, '스킬 이름이 유효하지 않습니다', { code: 'INVALID_NAME' });
  }
  // 영문/숫자/하이픈/언더스코어만 허용
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw createHttpError(400, '스킬 이름은 영문/숫자/하이픈/언더스코어만 허용됩니다', {
      code: 'INVALID_NAME',
    });
  }
}

/** SKILL.md 파일에서 frontmatter 파싱 (name, description) */
function parseFrontmatter(content: string): { name?: string; description?: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) result[kv[1]] = kv[2].trim();
  }
  return result;
}

/** SKILL.md frontmatter 생성 */
function buildFrontmatter(name: string, description: string, body: string): string {
  const trimmed = body.replace(/^---\n[\s\S]*?\n---\n?/, '');
  return `---\nname: ${name}\ndescription: ${description}\n---\n${trimmed}`;
}

/** 특정 폴더(활성/비활성)의 스킬 목록 반환 */
async function listSkillsInDir(baseDir: string, enabled: boolean): Promise<SkillSummary[]> {
  try {
    const entries = await readdir(baseDir, { withFileTypes: true });
    const skills: SkillSummary[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillPath = join(baseDir, entry.name, 'SKILL.md');
      try {
        const content = await readFile(skillPath, 'utf-8');
        const meta = parseFrontmatter(content);
        skills.push({
          name: entry.name,
          description: meta.description ?? '',
          enabled,
        });
      } catch {
        // SKILL.md 없으면 스킵
      }
    }
    return skills;
  } catch {
    return [];
  }
}

/** 프로젝트의 모든 스킬 목록 (활성 + 비활성) */
async function listSkills(repoPath: string): Promise<SkillSummary[]> {
  const enabledSkills = await listSkillsInDir(join(repoPath, SKILLS_DIR), true);
  const disabledSkills = await listSkillsInDir(join(repoPath, DISABLED_DIR), false);
  return [...enabledSkills, ...disabledSkills].sort((a, b) => a.name.localeCompare(b.name));
}

/** 스킬 경로 해석 — 활성/비활성 디렉토리 중 존재하는 쪽 반환 */
async function resolveSkillDir(
  repoPath: string,
  name: string,
): Promise<{ dir: string; enabled: boolean } | null> {
  const enabledPath = join(repoPath, SKILLS_DIR, name);
  const disabledPath = join(repoPath, DISABLED_DIR, name);
  try {
    const s = await stat(enabledPath);
    if (s.isDirectory()) return { dir: enabledPath, enabled: true };
  } catch { /* 무시 */ }
  try {
    const s = await stat(disabledPath);
    if (s.isDirectory()) return { dir: disabledPath, enabled: false };
  } catch { /* 무시 */ }
  return null;
}

/** 스킬 상세 조회 (content 포함) */
async function getSkill(repoPath: string, name: string) {
  validateSkillName(name);
  const resolved = await resolveSkillDir(repoPath, name);
  if (!resolved) {
    throw createHttpError(404, '스킬을 찾을 수 없습니다', { code: 'SKILL_NOT_FOUND' });
  }
  const content = await readFile(join(resolved.dir, 'SKILL.md'), 'utf-8');
  const meta = parseFrontmatter(content);
  // frontmatter 제외한 본문만 반환
  const body = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
  return {
    name,
    description: meta.description ?? '',
    content: body,
    enabled: resolved.enabled,
  };
}

/** 새 스킬 생성 — 기본 활성 상태 */
async function createSkill(
  repoPath: string,
  name: string,
  description: string,
  content: string,
) {
  validateSkillName(name);
  if (description.length > 200) {
    throw createHttpError(400, '설명이 너무 깁니다 (최대 200자)', { code: 'INVALID_DESCRIPTION' });
  }

  // 이미 존재하는지 확인 (활성/비활성 둘 다)
  const existing = await resolveSkillDir(repoPath, name);
  if (existing) {
    throw createHttpError(409, '이미 존재하는 스킬입니다', { code: 'SKILL_EXISTS' });
  }

  const skillDir = join(repoPath, SKILLS_DIR, name);
  await mkdir(skillDir, { recursive: true });
  const fullContent = buildFrontmatter(name, description, content);
  await writeFile(join(skillDir, 'SKILL.md'), fullContent, 'utf-8');
  return { name, description, enabled: true };
}

/** 스킬 내용 수정 */
async function updateSkill(
  repoPath: string,
  name: string,
  description: string,
  content: string,
) {
  validateSkillName(name);
  if (description.length > 200) {
    throw createHttpError(400, '설명이 너무 깁니다 (최대 200자)', { code: 'INVALID_DESCRIPTION' });
  }
  const resolved = await resolveSkillDir(repoPath, name);
  if (!resolved) {
    throw createHttpError(404, '스킬을 찾을 수 없습니다', { code: 'SKILL_NOT_FOUND' });
  }
  const fullContent = buildFrontmatter(name, description, content);
  await writeFile(join(resolved.dir, 'SKILL.md'), fullContent, 'utf-8');
  return { name, description, enabled: resolved.enabled };
}

/** 스킬 활성/비활성 토글 — 폴더 이동 */
async function toggleSkill(repoPath: string, name: string) {
  validateSkillName(name);
  const resolved = await resolveSkillDir(repoPath, name);
  if (!resolved) {
    throw createHttpError(404, '스킬을 찾을 수 없습니다', { code: 'SKILL_NOT_FOUND' });
  }

  const targetParent = resolved.enabled ? DISABLED_DIR : SKILLS_DIR;
  const targetDir = join(repoPath, targetParent, name);
  // 대상 부모 디렉토리 생성
  await mkdir(join(repoPath, targetParent), { recursive: true });
  await rename(resolved.dir, targetDir);
  return { name, enabled: !resolved.enabled };
}

/** 스킬 삭제 */
async function deleteSkill(repoPath: string, name: string) {
  validateSkillName(name);
  const resolved = await resolveSkillDir(repoPath, name);
  if (!resolved) {
    throw createHttpError(404, '스킬을 찾을 수 없습니다', { code: 'SKILL_NOT_FOUND' });
  }
  await rm(resolved.dir, { recursive: true, force: true });
}

export const skillsService = {
  listSkills,
  getSkill,
  createSkill,
  updateSkill,
  toggleSkill,
  deleteSkill,
};
