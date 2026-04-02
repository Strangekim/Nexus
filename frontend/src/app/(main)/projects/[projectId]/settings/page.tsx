// Skills / CLAUDE.md 편집 페이지 — 프로젝트 설정 탭 UI

import { SkillsEditor } from '@/components/editor/SkillsEditor';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <SkillsEditor projectId={projectId} />;
}
