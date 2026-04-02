/**
 * @module components/settings/ClaudeAuthSettings
 * @description Claude OAuth 연동/해제 설정 패널.
 *
 * 동작:
 *   - 미연동: "Claude 계정 연동" 버튼 → 팝업으로 인증 URL 열기 → 코드 입력 → 연동 완료
 *   - 연동됨: teal 뱃지 + 구독 플랜 표시 + "연동 해제" 버튼
 *   - URL 전체 붙여넣기 시 code 파라미터 자동 추출
 */
'use client';

import { useState } from 'react';
import { CheckCircle2, AlertCircle, Link, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import {
  startClaudeAuth,
  completeClaudeAuth,
  disconnectClaude,
} from '@/services/api/auth';

/** URL에서 code 파라미터 추출 — 일반 코드 문자열이면 그대로 반환 */
function extractCode(input: string): string {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get('code');
    if (code) return code;
  } catch {
    // URL이 아닌 경우 — 코드 문자열 그대로 사용
  }
  return trimmed;
}

/** Claude OAuth 연동 설정 패널 */
export function ClaudeAuthSettings() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  // 인증 코드(또는 URL) 입력 값
  const [codeInput, setCodeInput] = useState('');
  // 인증 URL 팝업 표시 후 코드 입력 단계 진입 여부
  const [awaitingCode, setAwaitingCode] = useState(false);
  // 처리 중 상태
  const [loading, setLoading] = useState(false);
  // 에러 메시지
  const [error, setError] = useState<string | null>(null);

  const isConnected = user?.claudeConnected ?? false;
  const subType = user?.claudeSubscriptionType;

  /** 연동 시작 — authUrl을 팝업으로 열고 코드 입력 단계로 전환 */
  async function handleStartAuth() {
    setLoading(true);
    setError(null);
    try {
      const { authUrl } = await startClaudeAuth();
      window.open(authUrl, 'claude-oauth', 'width=600,height=700,noopener');
      setAwaitingCode(true);
    } catch {
      setError('인증 URL을 불러오지 못했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  /** 연동 완료 — code를 서버로 전달, 성공 시 user 상태 업데이트 */
  async function handleComplete() {
    const code = extractCode(codeInput);
    if (!code) {
      setError('인증 코드를 입력해주세요.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await completeClaudeAuth(code);
      if (result.success) {
        setUser({
          ...user!,
          claudeConnected: true,
          claudeSubscriptionType: result.subscriptionType,
        });
        setAwaitingCode(false);
        setCodeInput('');
      } else {
        setError('인증에 실패했습니다. 코드를 확인하고 다시 시도해주세요.');
      }
    } catch {
      setError('토큰 교환에 실패했습니다. 코드가 만료되었을 수 있습니다.');
    } finally {
      setLoading(false);
    }
  }

  /** 연동 해제 */
  async function handleDisconnect() {
    setLoading(true);
    setError(null);
    try {
      await disconnectClaude();
      setUser({ ...user!, claudeConnected: false, claudeSubscriptionType: undefined });
    } catch {
      setError('연동 해제에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6B7B]">
        Claude 계정 연동
      </p>

      {/* 연동 상태 뱃지 */}
      <div className="flex items-center gap-2">
        {isConnected ? (
          <>
            <CheckCircle2 className="size-3.5 shrink-0" style={{ color: '#2D7D7B' }} />
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: 'rgba(45,125,123,0.12)', color: '#2D7D7B' }}
            >
              Claude{subType ? ` ${subType}` : ''} 연동됨
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="size-3.5 shrink-0" style={{ color: '#E0845E' }} />
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: 'rgba(224,132,94,0.12)', color: '#E0845E' }}
            >
              미연동
            </span>
          </>
        )}
      </div>

      {/* 미연동 상태 UI */}
      {!isConnected && (
        <div className="space-y-2">
          {!awaitingCode ? (
            /* 연동 시작 버튼 */
            <Button
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs"
              style={{ backgroundColor: '#2D7D7B', color: '#fff' }}
              onClick={handleStartAuth}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Link className="size-3.5" />
              )}
              Claude 계정 연동
            </Button>
          ) : (
            /* 인증 코드 입력 단계 */
            <div className="space-y-1.5">
              <p className="text-xs text-[#6B6B7B]">
                팝업에서 Claude 계정 로그인 후, 인증 코드 또는 리디렉션 URL을 붙여넣으세요.
              </p>
              <div className="flex gap-1.5">
                <Input
                  type="text"
                  placeholder="코드 또는 URL 붙여넣기"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  className="h-8 flex-1 text-xs"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleComplete(); }}
                />
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs"
                  style={{ backgroundColor: '#2D7D7B', color: '#fff' }}
                  onClick={handleComplete}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="size-3.5 animate-spin" /> : '연동 완료'}
                </Button>
              </div>
              {/* 팝업이 안 열렸을 때 재시작 링크 */}
              <button
                type="button"
                className="text-xs text-[#6B6B7B] underline underline-offset-2 hover:opacity-80"
                onClick={handleStartAuth}
                disabled={loading}
              >
                팝업 다시 열기
              </button>
            </div>
          )}
        </div>
      )}

      {/* 연동된 상태 — 해제 버튼 */}
      {isConnected && (
        <button
          type="button"
          className="text-xs text-red-500 underline underline-offset-2 hover:opacity-80 disabled:opacity-40"
          onClick={handleDisconnect}
          disabled={loading}
        >
          {loading ? '해제 중...' : '연동 해제'}
        </button>
      )}

      {/* 에러 메시지 */}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
