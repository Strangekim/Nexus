/**
 * @module lib/browser-notification
 * @description 브라우저 Notification API 래퍼 유틸리티.
 *
 * 권한 요청 흐름:
 *   1. `requestNotificationPermission()` 호출 시 현재 권한 상태 확인.
 *   2. 이미 `granted` 또는 `denied`이면 즉시 해당 값 반환 (팝업 미표시).
 *   3. `default` 상태이면 브라우저 권한 팝업을 표시하고 사용자 응답을 기다림.
 *   4. 사용자가 '허용'하면 `granted`, '차단'하면 `denied` 반환.
 *
 * 알림 표시 조건:
 *   - Notification API 지원 브라우저 (구형 브라우저 미지원)
 *   - 권한이 `granted`인 상태
 *   - 현재 탭이 포커스를 잃은 상태 (백그라운드) — 포커스 중이면 알림 생략
 *
 * 주의: Notification API는 브라우저 보안 정책상 HTTPS 또는 localhost에서만 동작한다.
 */

/**
 * 브라우저 알림 권한 요청.
 * - 이미 `granted`/`denied`이면 팝업 없이 즉시 반환.
 * - `default` 상태이면 브라우저 권한 팝업을 표시.
 * - Notification API 미지원 브라우저에서는 `'denied'` 반환.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  // Notification API 미지원 브라우저 (일부 구형 브라우저, 특정 WebView 등)
  if (!('Notification' in window)) {
    console.warn('[BrowserNotification] 이 브라우저는 알림을 지원하지 않습니다');
    return 'denied';
  }

  // 이미 사용자가 결정한 상태이면 팝업 없이 즉시 반환
  // — granted: 이미 허용됨, denied: 이미 차단됨 (재요청 불가)
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }

  // default 상태: 사용자에게 권한 팝업 표시 후 결과 반환
  return Notification.requestPermission();
}

/**
 * 현재 브라우저 알림 권한 상태를 반환.
 * Notification API 미지원 환경에서는 `'denied'` 반환.
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

/**
 * 브라우저 푸시 알림 표시.
 * 탭이 포커스를 잃었을 때(백그라운드)만 알림을 표시하고,
 * 알림 클릭 시 해당 탭을 포커스하며 5초 후 자동으로 닫힌다.
 *
 * @param title - 알림 제목 (예: '작업 완료')
 * @param body  - 알림 본문 (예: '"로그인 API 구현" 세션이 완료되었습니다.')
 */
export function showNotification(title: string, body: string): void {
  // Notification API 미지원 브라우저 → 조용히 skip
  if (!('Notification' in window)) return;
  // 권한이 없으면 알림 표시 불가
  if (Notification.permission !== 'granted') return;

  // 탭이 현재 포커스 상태이면 알림 생략 — 이미 화면을 보고 있으므로 불필요한 팝업 방지
  if (document.hasFocus()) return;

  try {
    const notif = new Notification(title, {
      body,
      icon: '/icon.png',   // 알림 아이콘 — 앱 아이콘 사용
      badge: '/icon.png',  // 모바일 배지 아이콘
    });

    // 알림 클릭 시 앱 탭을 앞으로 가져오고 알림 닫기
    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    // 5초 후 자동 닫기 — 알림이 화면에 너무 오래 남지 않도록
    setTimeout(() => notif.close(), 5000);
  } catch (err) {
    console.error('[BrowserNotification] 알림 표시 실패:', err);
  }
}
