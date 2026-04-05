'use client';
// Skills 관리 UI — 카드 목록 + 활성/비활성 토글 + 편집/생성/삭제 모달

import { useState } from 'react';
import { Plus, Power, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useSkillsList,
  useToggleSkill,
  useDeleteSkill,
} from '@/hooks/useSkills';
import { SkillEditModal } from './SkillEditModal';

interface SkillsListProps {
  projectId: string;
}

export function SkillsList({ projectId }: SkillsListProps) {
  const { data, isLoading } = useSkillsList(projectId);
  const toggleMutation = useToggleSkill(projectId);
  const deleteMutation = useDeleteSkill(projectId);

  /** 편집 모달 상태 — name이 null이면 새 스킬 생성 모드 */
  const [editModal, setEditModal] = useState<{ open: boolean; name: string | null }>({
    open: false,
    name: null,
  });

  const skills = data?.skills ?? [];
  const enabledCount = skills.filter((s) => s.enabled).length;

  const handleToggle = (name: string) => {
    toggleMutation.mutate(name);
  };

  const handleDelete = (name: string) => {
    if (!confirm(`"${name}" 스킬을 삭제하시겠습니까?`)) return;
    deleteMutation.mutate(name);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-5 animate-spin" style={{ color: '#2D7D7B' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 상단 바 — 카운트 + 새 스킬 버튼 */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'white', borderColor: '#E8E5DE' }}
      >
        <div className="text-sm" style={{ color: '#6B6B7B' }}>
          활성 <span className="font-semibold" style={{ color: '#2D7D7B' }}>{enabledCount}</span> / 전체 {skills.length}
        </div>
        <Button
          onClick={() => setEditModal({ open: true, name: null })}
          size="sm"
          className="flex items-center gap-1.5"
          style={{ background: '#2D7D7B', color: 'white' }}
        >
          <Plus className="size-3.5" />
          새 스킬
        </Button>
      </div>

      {/* 스킬 카드 목록 */}
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {skills.length === 0 && (
          <div className="text-center py-12 text-sm" style={{ color: '#6B6B7B' }}>
            아직 스킬이 없습니다. 새 스킬을 추가하세요.
          </div>
        )}

        {skills.map((skill) => (
          <div
            key={skill.name}
            className="flex items-start gap-3 p-3 rounded-lg border transition-all"
            style={{
              background: 'white',
              borderColor: skill.enabled ? '#2D7D7B40' : '#E8E5DE',
              opacity: skill.enabled ? 1 : 0.6,
            }}
          >
            {/* 토글 버튼 */}
            <button
              onClick={() => handleToggle(skill.name)}
              disabled={toggleMutation.isPending}
              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{
                background: skill.enabled ? '#2D7D7B' : '#E8E5DE',
                color: skill.enabled ? 'white' : '#6B6B7B',
              }}
              title={skill.enabled ? '비활성화' : '활성화'}
              aria-label={skill.enabled ? '비활성화' : '활성화'}
            >
              <Power className="size-4" />
            </button>

            {/* 스킬 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono text-sm font-semibold" style={{ color: '#1A1A2E' }}>
                  {skill.name}
                </span>
                {skill.enabled && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: '#2D7D7B20', color: '#2D7D7B' }}
                  >
                    활성
                  </span>
                )}
              </div>
              <p className="text-xs truncate" style={{ color: '#6B6B7B' }}>
                {skill.description || '(설명 없음)'}
              </p>
            </div>

            {/* 액션 버튼 */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditModal({ open: true, name: skill.name })}
                className="p-1.5 rounded hover:bg-[#E8E5DE] transition-colors"
                style={{ color: '#6B6B7B' }}
                title="편집"
                aria-label="편집"
              >
                <Edit2 className="size-3.5" />
              </button>
              <button
                onClick={() => handleDelete(skill.name)}
                disabled={deleteMutation.isPending}
                className="p-1.5 rounded hover:bg-[#E0845E14] transition-colors"
                style={{ color: '#E0845E' }}
                title="삭제"
                aria-label="삭제"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 편집 모달 */}
      {editModal.open && (
        <SkillEditModal
          projectId={projectId}
          name={editModal.name}
          onClose={() => setEditModal({ open: false, name: null })}
        />
      )}
    </div>
  );
}
