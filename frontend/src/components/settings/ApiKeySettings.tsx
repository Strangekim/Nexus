/**
 * @module components/settings/ApiKeySettings
 * @description Claude API 키 등록/삭제 설정 패널.
 *
 * 동작:
 *   - 등록 상태: 마스킹된 키 표시 (예: "sk-ant-...XYZ") + teal 뱃지 + 삭제 버튼
 *   - 미등록 상태: coral 뱃지 + 입력 필드 + 저장 버튼
 *   - 저장 성공 시 authStore.setUser 호출로 전역 상태 즉시 반영
 */
'use client';

import { useState } from 'react';
import { KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { saveClaudeApiKey } from '@/services/api/auth';

/** Claude API 키 설정 패널 */
export function ApiKeySettings() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  // 입력 필드 값 (password 타입)
  const [apiKey, setApiKey] = useState('');
  // 비밀번호 보이기/숨기기 토글
  const [showKey, setShowKey] = useState(false);
  // 저장/삭제 처리 중 상태
  const [saving, setSaving] = useState(false);
  // 에러 메시지
  const [error, setError] = useState<string | null>(null);
  // 성공 메시지
  const [success, setSuccess] = useState<string | null>(null);

  const hasKey = user?.hasClaudeKey ?? false;
  const maskedKey = user?.claudeAccountMasked;

  /** API 키 저장 */
  async function handleSave() {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setError('API 키를 입력해주세요.');
      return;
    }
    if (!trimmed.startsWith('sk-ant-')) {
      setError('올바른 Anthropic API 키 형식이 아닙니다. (sk-ant-... 형식)');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await saveClaudeApiKey(trimmed);
      setUser({ ...user!, ...updated });
      setApiKey('');
      setSuccess('API 키가 저장되었습니다.');
    } catch {
      setError('API 키 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  /** API 키 삭제 (빈 문자열 전달) */
  async function handleDelete() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await saveClaudeApiKey('');
      setUser({ ...user!, ...updated });
      setSuccess('API 키가 삭제되었습니다.');
    } catch {
      setError('API 키 삭제에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6B7B]">Claude API 키</p>

      {/* 현재 등록 상태 뱃지 */}
      <div className="flex items-center gap-2">
        {hasKey ? (
          <>
            <CheckCircle2 className="size-3.5 shrink-0" style={{ color: '#2D7D7B' }} />
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: 'rgba(45,125,123,0.12)', color: '#2D7D7B' }}
            >
              등록됨
            </span>
            {maskedKey && (
              <span className="font-mono text-xs text-[#6B6B7B]">{maskedKey}</span>
            )}
          </>
        ) : (
          <>
            <AlertCircle className="size-3.5 shrink-0" style={{ color: '#E0845E' }} />
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: 'rgba(224,132,94,0.12)', color: '#E0845E' }}
            >
              미등록
            </span>
          </>
        )}
      </div>

      {/* 키 등록 입력 영역 */}
      {!hasKey && (
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="h-8 pr-8 font-mono text-xs"
                maxLength={200}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              />
              {/* 비밀번호 보이기/숨기기 버튼 */}
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B6B7B] hover:text-[#1A1A1A]"
                aria-label={showKey ? '키 숨기기' : '키 보기'}
              >
                {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
            <Button size="sm" className="h-8 px-3 text-xs" onClick={handleSave} disabled={saving}>
              {saving ? '저장 중' : '저장'}
            </Button>
          </div>
          <p className="text-xs text-[#6B6B7B]">
            <KeyRound className="mr-1 inline size-3" />
            Anthropic Console에서 발급한 API 키를 입력하세요.
          </p>
        </div>
      )}

      {/* 키 등록된 경우 삭제 버튼 */}
      {hasKey && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-xs"
          onClick={handleDelete}
          disabled={saving}
        >
          {saving ? '삭제 중' : 'API 키 삭제'}
        </Button>
      )}

      {/* 성공/에러 메시지 */}
      {success && <p className="text-xs" style={{ color: '#2D7D7B' }}>{success}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
