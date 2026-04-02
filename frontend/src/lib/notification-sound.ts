// Web Audio API를 이용한 알림음 생성 — 외부 파일 없이 비프음 재생

/** AudioContext 싱글턴 — 브라우저 정책상 첫 사용자 제스처 이후 생성 */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) {
      console.warn('[NotificationSound] Web Audio API를 지원하지 않는 브라우저입니다');
      return null;
    }
    audioCtx = new AudioContextClass();
  }

  return audioCtx;
}

/**
 * 작업 완료 알림음 — 두 음 연속 재생 (밝은 상승 톤)
 * 사용자 제스처(클릭 등) 이후에만 정상 작동
 */
export function playNotificationSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // AudioContext가 suspended 상태면 resume 시도
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  // 첫 번째 음: 880Hz (A5) 0.0~0.15초
  playTone(ctx, 880, 0.0, 0.15);
  // 두 번째 음: 1100Hz (C#6) 0.15~0.35초
  playTone(ctx, 1100, 0.15, 0.35);
}

/**
 * 단일 톤 재생 헬퍼
 * @param ctx - AudioContext
 * @param frequency - 주파수 (Hz)
 * @param startOffset - 재생 시작 오프셋 (초)
 * @param endOffset - 재생 종료 오프셋 (초)
 */
function playTone(
  ctx: AudioContext,
  frequency: number,
  startOffset: number,
  endOffset: number,
): void {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + startOffset);

  // 페이드 인/아웃으로 자연스러운 음색
  gainNode.gain.setValueAtTime(0, ctx.currentTime + startOffset);
  gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + startOffset + 0.05);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + endOffset);

  oscillator.start(ctx.currentTime + startOffset);
  oscillator.stop(ctx.currentTime + endOffset);
}
