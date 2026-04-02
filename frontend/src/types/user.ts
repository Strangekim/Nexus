/** 사용자 정보 타입 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  linuxUser?: string;
  authMode: 'subscription' | 'api';
  // 알림 설정
  phone?: string | null;
  notifySms?: boolean;
  notifyBrowser?: boolean;
  notifySound?: boolean;
}
