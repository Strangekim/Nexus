// 브라우저 푸시 알림 유틸리티

/** 브라우저 알림 권한 요청 — 이미 granted/denied면 즉시 반환 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[BrowserNotification] 이 브라우저는 알림을 지원하지 않습니다');
    return 'denied';
  }

  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }

  return Notification.requestPermission();
}

/** 현재 알림 권한 상태 반환 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

/**
 * 브라우저 푸시 알림 표시
 * @param title - 알림 제목
 * @param body - 알림 본문
 */
export function showNotification(title: string, body: string): void {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // 문서가 포커스 상태일 때는 알림 생략 (탭이 활성화된 경우)
  if (document.hasFocus()) return;

  try {
    const notif = new Notification(title, {
      body,
      icon: '/icon.png',
      badge: '/icon.png',
    });

    // 알림 클릭 시 앱 탭 포커스
    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    // 5초 후 자동 닫기
    setTimeout(() => notif.close(), 5000);
  } catch (err) {
    console.error('[BrowserNotification] 알림 표시 실패:', err);
  }
}
