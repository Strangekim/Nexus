// 알림 설정 컴포넌트 — SMS / 브라우저 푸시 / 알림음 on/off
'use client';

import { useState, useEffect } from 'react';
import { Bell, Volume2, MessageSquare, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';
import { requestNotificationPermission, getNotificationPermission } from '@/lib/browser-notification';
import { playNotificationSound } from '@/lib/notification-sound';

/** 알림 설정 API 호출 */
async function patchSettings(data: {
  phone?: string | null;
  notifySms?: boolean;
  notifyBrowser?: boolean;
  notifySound?: boolean;
}) {
  const res = await fetch('/api/auth/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('설정 저장 실패');
  return res.json();
}

/** 토글 행 공통 컴포넌트 */
function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
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
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    setBrowserPermission(getNotificationPermission());
  }, []);

  /** 개별 토글 설정 저장 */
  async function handleToggle(field: 'notifySms' | 'notifyBrowser' | 'notifySound', value: boolean) {
    if (!user) return;
    try {
      const updated = await patchSettings({ [field]: value });
      setUser({ ...user, ...updated });
    } catch {
      // 실패 시 무시 — 다음 번에 다시 시도 가능
    }
  }

  /** 전화번호 + SMS 설정 저장 */
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

  /** 브라우저 알림 권한 요청 */
  async function handleRequestPermission() {
    const perm = await requestNotificationPermission();
    setBrowserPermission(perm);
  }

  /** 알림음 미리 듣기 */
  function handlePreviewSound() {
    playNotificationSound();
  }

  return (
    <div className="space-y-4 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6B7B]">알림 설정</p>

      {/* 브라우저 푸시 알림 */}
      <ToggleRow
        icon={<Bell className="size-3.5" />}
        label="브라우저 푸시 알림"
        description="탭이 백그라운드일 때 데스크톱 알림 표시"
        checked={user?.notifyBrowser ?? true}
        onChange={(v) => handleToggle('notifyBrowser', v)}
      />

      {/* 브라우저 권한이 granted가 아니면 권한 요청 버튼 표시 */}
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

      {/* 알림음 */}
      <ToggleRow
        icon={<Volume2 className="size-3.5" />}
        label="알림음"
        description="작업 완료 시 짧은 소리 재생"
        checked={user?.notifySound ?? true}
        onChange={(v) => handleToggle('notifySound', v)}
      />
      {(user?.notifySound ?? true) && (
        <button
          onClick={handlePreviewSound}
          className="text-xs text-[#2D7D7B] hover:underline"
        >
          미리 듣기
        </button>
      )}

      {/* SMS 알림 토글 */}
      <ToggleRow
        icon={<Smartphone className="size-3.5" />}
        label="SMS 알림"
        description="작업 완료 시 문자 발송"
        checked={user?.notifySms ?? false}
        onChange={(v) => handleToggle('notifySms', v)}
      />

      {/* 전화번호 입력 — SMS 활성화 시에만 표시 */}
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
            <Button size="sm" className="h-8 px-3 text-xs" onClick={handleSaveSms} disabled={saving}>
              {saving ? '저장 중' : '저장'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
