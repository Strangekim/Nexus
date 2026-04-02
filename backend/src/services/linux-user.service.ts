// Linux 유저 관리 서비스 — 프로젝트별 터미널 격리용
import { execFileSync } from 'node:child_process';
import prisma from '../lib/prisma.js';

/** Linux 유저명 생성 규칙: dev-{userId 앞 8자} */
function toLinuxUsername(userId: string): string {
  return `dev-${userId.replace(/-/g, '').slice(0, 8)}`;
}

/** Linux 유저 존재 여부 확인 */
function linuxUserExists(username: string): boolean {
  try {
    execFileSync('id', [username], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/** Linux 유저 생성 + DB에 linuxUser 저장 */
async function ensureLinuxUser(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { linuxUser: true, role: true },
  });

  if (!user) throw new Error('사용자를 찾을 수 없습니다');

  // admin은 ubuntu 유저 사용 — linuxUser 불필요
  if (user.role === 'admin') return 'ubuntu';

  // 이미 linuxUser가 있으면 반환
  if (user.linuxUser) return user.linuxUser;

  const username = toLinuxUsername(userId);

  // Linux 유저 생성 (이미 존재하면 건너뜀)
  if (!linuxUserExists(username)) {
    execFileSync('sudo', ['useradd', '-m', '-s', '/bin/bash', username], {
      stdio: 'pipe',
    });
  }

  // DB에 linuxUser 저장
  await prisma.user.update({
    where: { id: userId },
    data: { linuxUser: username },
  });

  return username;
}

/** 프로젝트 디렉토리에 Linux 유저 접근 권한 부여 (ACL) */
function grantProjectAccess(username: string, projectPath: string): void {
  try {
    execFileSync('sudo', ['setfacl', '-R', '-m', `u:${username}:rwx`, projectPath], { stdio: 'pipe' });
    execFileSync('sudo', ['setfacl', '-R', '-d', '-m', `u:${username}:rwx`, projectPath], { stdio: 'pipe' });
  } catch {
    // setfacl 미설치 시 그룹 권한으로 대체
    try {
      execFileSync('sudo', ['usermod', '-aG', 'ubuntu', username], { stdio: 'pipe' });
    } catch { /* 무시 */ }
  }
}

/** 프로젝트 디렉토리에서 Linux 유저 접근 권한 제거 */
function revokeProjectAccess(username: string, projectPath: string): void {
  try {
    execFileSync('sudo', ['setfacl', '-R', '-x', `u:${username}`, projectPath], { stdio: 'pipe' });
  } catch { /* 무시 */ }
}

export const linuxUserService = {
  toLinuxUsername,
  ensureLinuxUser,
  grantProjectAccess,
  revokeProjectAccess,
};
