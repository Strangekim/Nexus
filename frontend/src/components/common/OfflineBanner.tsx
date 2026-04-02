'use client';
// 오프라인 상태 감지 배너 — navigator.onLine + online/offline 이벤트

import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

/** 네트워크 연결이 끊길 때 상단에 표시되는 빨간 배너 */
export function OfflineBanner() {
  // SSR 시 기본값 true (서버에서는 온라인으로 가정)
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // 초기 상태 동기화 — 클라이언트 마운트 후 실제 상태 반영
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 온라인 상태면 렌더링하지 않음
  if (isOnline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white"
      style={{ backgroundColor: '#DC2626' }}
    >
      <WifiOff size={16} aria-hidden="true" />
      <span>네트워크 연결이 끊겼습니다. 인터넷 연결을 확인해주세요.</span>
    </div>
  );
}
