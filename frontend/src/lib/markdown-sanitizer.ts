// 불완전 마크다운 처리 — 스트리밍 중 열린 코드블록/볼드 닫기

export function sanitizeMarkdown(text: string): string {
  // 열린 코드 펜스 닫기
  const fenceCount = (text.match(/```/g) || []).length;
  if (fenceCount % 2 !== 0) {
    text += '\n```';
  }

  // 열린 볼드 마커 닫기
  const boldCount = (text.match(/\*\*/g) || []).length;
  if (boldCount % 2 !== 0) {
    text += '**';
  }

  return text;
}
