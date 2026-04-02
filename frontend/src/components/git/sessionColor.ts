// 세션 ID 해시 기반 HSL 색상 생성 유틸

/** 문자열을 숫자 해시값으로 변환 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // 32비트 정수로 변환
  }
  return Math.abs(hash);
}

/** 세션 ID → HSL 색상 문자열 반환 */
export function getSessionColor(sessionId: string | null | undefined): string {
  if (!sessionId) return '#9CA3AF'; // 세션 없음 — 회색
  const hue = hashString(sessionId) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

/** 세션 ID → 연한 배경색 반환 */
export function getSessionBgColor(sessionId: string | null | undefined): string {
  if (!sessionId) return 'hsl(0, 0%, 95%)';
  const hue = hashString(sessionId) % 360;
  return `hsl(${hue}, 55%, 96%)`;
}
