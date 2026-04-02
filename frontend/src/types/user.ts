/** 사용자 정보 타입 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  linuxUser?: string;
  authMode: 'subscription' | 'api';
  createdAt?: string;
  // Claude API 키 등록 여부 (api 모드에서 사용)
  hasClaudeKey?: boolean;
  // 마스킹된 API 키 (예: "sk-ant-...XYZ") — 등록 확인용, 미등록 시 undefined
  claudeAccountMasked?: string;
  // 알림 설정
  phone?: string | null;
  notifySms?: boolean;
  notifyBrowser?: boolean;
  notifySound?: boolean;
}
