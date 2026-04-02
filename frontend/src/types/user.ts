/** 사용자 정보 타입 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  linuxUser?: string;
  authMode: 'subscription' | 'api';
  createdAt?: string;
  // Claude OAuth 연동 여부 (subscription 모드에서 사용)
  claudeConnected?: boolean;
  // Claude 구독 플랜 ('pro' | 'max' 등) — 연동 시 서버에서 반환
  claudeSubscriptionType?: string;
  // 알림 설정
  phone?: string | null;
  notifySms?: boolean;
  notifyBrowser?: boolean;
  notifySound?: boolean;
}
