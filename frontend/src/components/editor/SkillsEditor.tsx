'use client';
// Skills / CLAUDE.md 웹 편집기 — 탭 전환 + textarea + Ctrl+S 저장

import { useState, useEffect, useCallback } from 'react';
import { Check, AlertCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useClaudeMd,
  useSkillsMd,
  useSaveClaudeMd,
  useSaveSkillsMd,
} from '@/hooks/useSkills';
import { EditorTab } from './EditorTab';
import { EditorTextarea } from './EditorTextarea';

type TabType = 'claude-md' | 'skills-md';

/** 저장 상태 레이블 */
function SaveStatus({ isDirty, isSaving, savedAt }: {
  isDirty: boolean;
  isSaving: boolean;
  savedAt: Date | null;
}) {
  if (isSaving) {
    return (
      <span className="flex items-center gap-1 text-xs" style={{ color: '#6B6B7B' }}>
        저장 중...
      </span>
    );
  }
  if (isDirty) {
    return (
      <span className="flex items-center gap-1 text-xs" style={{ color: '#E0845E' }}>
        <AlertCircle className="size-3" />
        변경사항 있음
      </span>
    );
  }
  if (savedAt) {
    return (
      <span className="flex items-center gap-1 text-xs" style={{ color: '#2D7D7B' }}>
        <Check className="size-3" />
        저장됨
      </span>
    );
  }
  return null;
}

/** Skills / CLAUDE.md 웹 편집기 메인 컴포넌트 */
export function SkillsEditor({ projectId }: { projectId: string }) {
  const [activeTab, setActiveTab] = useState<TabType>('claude-md');
  const [claudeDirty, setClaudeDirty] = useState(false);
  const [skillsDirty, setSkillsDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const { data: claudeData, isLoading: claudeLoading } = useClaudeMd(projectId);
  const { data: skillsData, isLoading: skillsLoading } = useSkillsMd(projectId);
  const saveClaude = useSaveClaudeMd(projectId);
  const saveSkills = useSaveSkillsMd(projectId);

  // 서버 데이터에서 직접 초기값 파생 — dirty 상태가 없으면 서버 원본 표시
  const [claudeContent, setClaudeContent] = useState('');
  const [skillsContent, setSkillsContent] = useState('');

  // 서버 데이터 초기화 (최초 1회, dirty 상태가 아닐 때만 반영)
  useEffect(() => {
    if (claudeData && !claudeDirty) {
      setClaudeContent(claudeData.content);
    }
    // claudeDirty는 의도적으로 deps에서 제외 — 초기 로드 시에만 서버값 적용
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claudeData]);

  useEffect(() => {
    if (skillsData && !skillsDirty) {
      setSkillsContent(skillsData.content);
    }
    // skillsDirty는 의도적으로 deps에서 제외 — 초기 로드 시에만 서버값 적용
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillsData]);

  // 현재 탭 저장 함수
  const handleSave = useCallback(async () => {
    if (activeTab === 'claude-md' && claudeDirty) {
      await saveClaude.mutateAsync(claudeContent);
      setClaudeDirty(false);
      setSavedAt(new Date());
    } else if (activeTab === 'skills-md' && skillsDirty) {
      await saveSkills.mutateAsync(skillsContent);
      setSkillsDirty(false);
      setSavedAt(new Date());
    }
  }, [activeTab, claudeDirty, skillsDirty, claudeContent, skillsContent, saveClaude, saveSkills]);

  // Ctrl+S 단축키 저장
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  const isSaving = saveClaude.isPending || saveSkills.isPending;
  const isDirty = activeTab === 'claude-md' ? claudeDirty : skillsDirty;
  const isLoading = activeTab === 'claude-md' ? claudeLoading : skillsLoading;

  // h-full: 부모(main 영역)를 꽉 채움, min-h-screen 제거 — 부모가 이미 overflow 제어함
  return (
    <div className="flex flex-col h-full" style={{ background: '#F5F5EF' }}>
      {/* 헤더 — 모바일에서 패딩 축소 */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-b"
        style={{ background: 'white', borderColor: '#E8E5DE' }}>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: '#1A1A2E' }}>
            프로젝트 설정
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#6B6B7B' }}>
            AI 지시사항과 Skills를 편집합니다
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SaveStatus isDirty={isDirty} isSaving={isSaving} savedAt={savedAt} />
          <Button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            size="sm"
            className="flex items-center gap-1.5"
            style={{ background: '#2D7D7B', color: 'white' }}
          >
            <Save className="size-3.5" />
            저장
          </Button>
        </div>
      </div>

      {/* 탭 바 — 모바일에서 패딩 축소 */}
      <div className="flex border-b px-4 lg:px-6" style={{ background: 'white', borderColor: '#E8E5DE' }}>
        <EditorTab
          label="CLAUDE.md"
          active={activeTab === 'claude-md'}
          onClick={() => setActiveTab('claude-md')}
        />
        <EditorTab
          label="skills.md"
          active={activeTab === 'skills-md'}
          onClick={() => setActiveTab('skills-md')}
        />
      </div>

      {/* 편집 영역 — 모바일에서 패딩 축소 */}
      <div className="flex-1 p-4 lg:p-6">
        <div className="h-full rounded-lg border overflow-hidden"
          style={{ background: 'white', borderColor: '#E8E5DE' }}>
          {activeTab === 'claude-md' ? (
            <EditorTextarea
              value={claudeContent}
              onChange={(v) => { setClaudeContent(v); setClaudeDirty(true); setSavedAt(null); }}
              placeholder="# CLAUDE.md&#10;&#10;Claude Code가 이 프로젝트에서 참고할 가이드를 작성하세요."
              isLoading={claudeLoading}
            />
          ) : (
            <EditorTextarea
              value={skillsContent}
              onChange={(v) => { setSkillsContent(v); setSkillsDirty(true); setSavedAt(null); }}
              placeholder="# Skills&#10;&#10;Claude Code가 사용할 Skills를 정의하세요."
              isLoading={skillsLoading}
            />
          )}
        </div>
      </div>

      {/* 하단 힌트 — 모바일에서 패딩 축소 */}
      <div className="px-4 lg:px-6 pb-4 text-xs" style={{ color: '#6B6B7B' }}>
        {isLoading ? '파일 불러오는 중...' : 'Ctrl+S 로 저장 · 저장 후 다음 Claude Code 세션에 반영됩니다'}
      </div>
    </div>
  );
}
