/**
 * @module components/notification/NotificationSettings
 * @description 알림 설정 패널 컴포넌트 — SMS / 브라우저 푸시 / 알림음 on-off 제어.
 *
 * 각 설정 항목:
 *   - 브라우저 푸시 알림: 탭이 백그라운드일 때 OS 데스크톱 알림 표시. 권한이 없으면 요청 버튼 표시.
 *   - 알림음: 작업 완료/허가 요청 시 Web Audio API로 짧은 비프음 재생. 미리 듣기 버튼 제공.
 *   - SMS 알림: 알리고 API를 통해 등록된 전화번호로 문자 발송. SMS 활성화 시에만 전화번호 입력 노출.
 *
 * 상태 관리:
 *   - 설정값은 authStore(Zustand)의 user 객체에서 읽어온다.
 *   - 토글 변경 즉시 PATCH /api/auth/settings 호출 후 authStore 업데이트.
 *   - 전화번호는 로컬 state로 관리하다가 '저장' 버튼 클릭 시에만 API 호출.
 */
'use client';

import { useState, useEffect } from 'react';
import { Bell, Volume2, MessageSquare, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';
import { requestNotificationPermission, getNotificationPermission } from '@/lib/browser-notification';
import { playNotificationSound } from '@/lib/notification-sound';

/**
 * 알림 설정 부분 업데이트 API 호출.
 * 변경할 필드만 body에 포함하면 된다.
 */
async function patchSettings(data: {
  phone?: string | null;
  notifySms?: boolean;
  notifyBrowser?: boolean;
  notifySound?: boolean;
}) {
  const res = await fetch('/api/auth/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    // httpOnly 쿠키 세션 인증 — credentials 필수
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('설정 저장 실패');
  return res.json();
}

/**
 * 토글 행 공통 컴포넌트.
 * 아이콘 + 라벨/설명 + 토글 스위치로 구성되며, 각 알림 설정 항목에서 재사용된다.
 */
function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  /** lucide-react 아이콘 노드 */
  icon: React.ReactNode;
  /** 설정 항목 이름 (예: '브라우저 푸시 알림') */
  label: string;
  /** 설정 항목 설명 (예: '탭이 백그라운드일 때 데스크톱 알림 표시') */
  description: string;
  /** 현재 토글 상태 */
  checked: boolean;
  /** 토글 변경 핸들러 */
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-[#6B6B7B]">{icon}</span>
        <div>
          <p className="text-sm font-medium text-[#1A1A1A]">{label}</p>
          <p className="text-xs text-[#6B6B7B]">{description}</p>
        </div>
      </div>
      {/* ARIA 접근성: role="switch" + aria-checked로 스크린 리더 지원 */}
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? 'bg-[#2D7D7B]' : 'bg-[#D1D1D1]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

/** 알림 설정 전체 패널 */
export function NotificationSettings() {
  // authStore에서 현재 로그인 유저 정보와 setter 가져오기
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  // 전화번호는 로컬 state로 관리 — '저장' 버튼 클릭 시에만 API 호출
  const [phone, setPhone] = useState(user?.phone ?? '');
  // SMS 저장 중 상태 (저장 버튼 비활성화용)
  const [saving, setSaving] = useState(false);
  // 브라우저 알림 권한 상태 — 'default' | 'granted' | 'denied'
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  // 컴포넌트 마운트 시 현재 브라우저 알림 권한 상태를 읽어옴
  useEffect(() => {
    setBrowserPermission(getNotificationPermission());
  }, []);

  /**
   * 개별 토글 설정 즉시 저장.
   * 토글 변경 즉시 API 호출 후 authStore 업데이트.
   * 실패 시 조용히 무시 — 다음 토글 시 재시도 가능.
   */
  async function handleToggle(field: 'notifySms' | 'notifyBrowser' | 'notifySound', value: boolean) {
    if (!user) return;
    try {
      const updated = await patchSettings({ [field]: value });
      // authStore의 user 객체를 서버 응답값으로 업데이트
      setUser({ ...user, ...updated });
    } catch {
      // 설정 저장 실패 시 조용히 무시 — 다음 번에 재시도 가능
    }
  }

  /**
   * 전화번호 + SMS 설정 저장.
   * '저장' 버튼 클릭 시에만 호출된다.
   * phone이 빈 문자열이면 null을 전송하여 번호를 삭제한다.
   */
  async function handleSaveSms() {
    if (!user) return;
    setSaving(true);
    try {
      const updated = await patchSettings({ phone: phone || null });
      setUser({ ...user, ...updated });
    } finally {
      setSaving(false);
    }
  }

  /**
   * 브라우저 알림 권한 요청.
   * 권한 상태가 'default'인 경우에만 팝업이 표시된다.
   * 결과에 따라 로컬 상태를 업데이트한다.
   */
  async function handleRequestPermission() {
    const perm = await requestNotificationPermission();
    setBrowserPermission(perm);
  }

  /**
   * 알림음 미리 듣기.
   * 현재 설정된 알림음을 즉시 재생한다.
   * Web Audio API 정책상 이 핸들러는 반드시 사용자 클릭 이벤트에서 호출되어야 한다.
   */
  function handlePreviewSound() {
    playNotificationSound();
  }

  return (
    <div className="space-y-4 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6B7B]">알림 설정</p>

      {/* 브라우저 푸시 알림 — 탭이 백그라운드일 때 OS 데스크톱 알림 표시 */}
      <ToggleRow
        icon={<Bell className="size-3.5" />}
        label="브라우저 푸시 알림"
        description="탭이 백그라운드일 때 데스크톱 알림 표시"
        checked={user?.notifyBrowser ?? true}
        onChange={(v) => handleToggle('notifyBrowser', v)}
      />

      {/* 브라우저 권한이 granted가 아닌 경우: 권한 요청 버튼 표시
          - default: 요청 가능 → 버튼 활성화
          - denied: 브라우저 설정에서 직접 변경해야 함 → 버튼 비활성화 */}
      {browserPermission !== 'granted' && (
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs"
          onClick={handleRequestPermission}
          disabled={browserPermission === 'denied'}
        >
          {browserPermission === 'denied'
            ? '브라우저에서 알림이 차단됨'
            : '브라우저 알림 권한 요청'}
        </Button>
      )}

      {/* 알림음 — 작업 완료 시 Web Audio API로 짧은 비프음 재생 */}
      <ToggleRow
        icon={<Volume2 className="size-3.5" />}
        label="알림음"
        description="작업 완료 시 짧은 소리 재생"
        checked={user?.notifySound ?? true}
        onChange={(v) => handleToggle('notifySound', v)}
      />
      {/* 알림음 활성화 시 미리 듣기 버튼 표시 — 사용자가 소리를 확인할 수 있도록 */}
      {(user?.notifySound ?? true) && (
        <button
          onClick={handlePreviewSound}
          className="text-xs text-[#2D7D7B] hover:underline"
        >
          미리 듣기
        </button>
      )}

      {/* SMS 알림 — 알리고 API를 통해 등록된 전화번호로 문자 발송 */}
      <ToggleRow
        icon={<Smartphone className="size-3.5" />}
        label="SMS 알림"
        description="작업 완료 시 문자 발송"
        checked={user?.notifySms ?? false}
        onChange={(v) => handleToggle('notifySms', v)}
      />

      {/* 전화번호 입력 영역 — SMS 알림 활성화 시에만 표시
          비활성화 상태에서는 렌더링하지 않아 UI를 간결하게 유지 */}
      {(user?.notifySms ?? false) && (
        <div className="space-y-1.5">
          <Label htmlFor="notif-phone" className="text-xs text-[#6B6B7B]">
            <MessageSquare className="mr-1 inline size-3" />
            수신 전화번호
          </Label>
          <div className="flex gap-1.5">
            <Input
              id="notif-phone"
              placeholder="01012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-8 text-xs"
              maxLength={20}
            />
            {/* 저장 버튼 클릭 시 전화번호를 DB에 저장 */}
            <Button size="sm" className="h-8 px-3 text-xs" onClick={handleSaveSms} disabled={saving}>
              {saving ? '저장 중' : '저장'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
