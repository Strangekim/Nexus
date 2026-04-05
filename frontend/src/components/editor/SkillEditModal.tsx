'use client';
// 스킬 편집/생성 모달 — name/description/content 입력

import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useSkillDetail,
  useCreateSkill,
  useUpdateSkill,
} from '@/hooks/useSkills';

interface SkillEditModalProps {
  projectId: string;
  /** null이면 새 스킬 생성, 있으면 편집 */
  name: string | null;
  onClose: () => void;
}

export function SkillEditModal({ projectId, name, onClose }: SkillEditModalProps) {
  const isNew = name === null;
  const { data: detail, isLoading } = useSkillDetail(projectId, name);
  const createMutation = useCreateSkill(projectId);
  const updateMutation = useUpdateSkill(projectId);

  const [form, setForm] = useState({ name: '', description: '', content: '' });
  const [error, setError] = useState<string | null>(null);

  // 편집 모드: 상세 데이터 로드되면 폼 초기화
  useEffect(() => {
    if (detail && !isNew) {
      setForm({
        name: detail.name,
        description: detail.description,
        content: detail.content,
      });
    }
  }, [detail, isNew]);

  const handleSave = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError('이름을 입력하세요');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(form.name)) {
      setError('이름은 영문/숫자/하이픈/언더스코어만 허용됩니다');
      return;
    }
    try {
      if (isNew) {
        await createMutation.mutateAsync({
          name: form.name.trim(),
          description: form.description.trim(),
          content: form.content,
        });
      } else {
        await updateMutation.mutateAsync({
          name: form.name,
          description: form.description.trim(),
          content: form.content,
        });
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '저장 실패';
      setError(msg);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(26,26,46,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg shadow-xl flex flex-col"
        style={{ background: 'white', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: '#E8E5DE' }}
        >
          <h2 className="text-base font-semibold" style={{ color: '#1A1A2E' }}>
            {isNew ? '새 스킬 추가' : `스킬 편집: ${name}`}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#E8E5DE]"
            style={{ color: '#6B6B7B' }}
            aria-label="닫기"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 폼 */}
        <div className="flex-1 overflow-auto p-5 space-y-3">
          {isLoading && !isNew && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin" style={{ color: '#2D7D7B' }} />
            </div>
          )}

          {(!isLoading || isNew) && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#1A1A2E' }}>
                  이름 (폴더명으로 사용)
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={!isNew}
                  placeholder="my-skill"
                  className="w-full px-3 py-2 text-sm rounded border font-mono"
                  style={{
                    borderColor: '#E8E5DE',
                    background: isNew ? 'white' : '#F5F5EF',
                    color: '#1A1A2E',
                  }}
                />
                <p className="text-xs mt-1" style={{ color: '#6B6B7B' }}>
                  영문/숫자/하이픈/언더스코어만 허용
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#1A1A2E' }}>
                  설명 (최대 200자)
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={200}
                  placeholder="Claude Code가 이 스킬을 언제 사용할지 설명"
                  className="w-full px-3 py-2 text-sm rounded border"
                  style={{ borderColor: '#E8E5DE', color: '#1A1A2E' }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#1A1A2E' }}>
                  내용 (SKILL.md 본문)
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="# 스킬 내용&#10;&#10;Claude가 따를 구체적인 지침을 작성하세요."
                  rows={14}
                  className="w-full px-3 py-2 text-sm rounded border font-mono resize-none"
                  style={{ borderColor: '#E8E5DE', color: '#1A1A2E' }}
                />
              </div>

              {error && (
                <div
                  className="text-xs px-3 py-2 rounded"
                  style={{ background: '#E0845E14', color: '#E0845E' }}
                >
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* 푸터 */}
        <div
          className="flex items-center justify-end gap-2 px-5 py-3 border-t"
          style={{ borderColor: '#E8E5DE' }}
        >
          <Button variant="outline" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className="flex items-center gap-1.5"
            style={{ background: '#2D7D7B', color: 'white' }}
          >
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}
