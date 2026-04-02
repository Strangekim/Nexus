/**
 * @module lib/notification-sound
 * @description Web Audio API를 이용한 알림음 생성 모듈.
 *
 * 외부 오디오 파일(.mp3, .wav 등) 없이 브라우저 내장 Web Audio API로 비프음을 동적 합성한다.
 * 파일 로드/캐싱 문제가 없고, 번들 크기에도 영향을 주지 않는 것이 장점이다.
 *
 * Web Audio API를 사용하는 이유:
 *   - 외부 파일 없이 순수 코드로 음색/주파수/길이를 자유롭게 제어 가능
 *   - `<audio>` 태그보다 정밀한 타이밍 제어 지원 (ctx.currentTime 기반 스케줄링)
 *   - 오프스크린 탭에서도 안정적으로 동작
 *
 * 브라우저 보안 정책 주의:
 *   - Web Audio API의 AudioContext는 사용자 제스처(클릭 등) 이전에 생성해도
 *     `suspended` 상태로 유지되므로, 첫 재생 시 `resume()`을 호출해야 한다.
 *   - 컴포넌트 마운트 시 바로 소리를 내는 것은 동작하지 않을 수 있으며,
 *     버튼 클릭 등 실제 사용자 인터랙션 이후에 호출해야 한다.
 */

/**
 * AudioContext 싱글턴 인스턴스.
 * 여러 번 생성하면 브라우저 리소스를 낭비하므로 앱 전체에서 하나만 유지한다.
 * 첫 호출 시 지연 생성(lazy initialization)된다.
 */
let audioCtx: AudioContext | null = null;

/**
 * AudioContext 싱글턴을 반환한다.
 * SSR(Next.js 서버 렌더링) 환경에서는 window가 없으므로 null 반환.
 * webkitAudioContext는 구형 Safari 호환성을 위한 폴백이다.
 */
function getAudioContext(): AudioContext | null {
  // SSR 환경(Node.js) — window 없음
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    // webkitAudioContext: 구형 Safari(iOS 포함) 호환성 폴백
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
 * 작업 완료 알림음 재생.
 * 두 음을 연속 재생하여 밝고 명확한 상승 톤을 만든다:
 *   - 1음: 880 Hz (A5, 라음) — 주의를 끄는 첫 신호
 *   - 2음: 1100 Hz (약 C#6) — 완료감을 주는 높은 마무리 음
 *
 * 사용자 제스처(클릭, 키 입력 등) 이후에만 정상 작동한다.
 * AudioContext가 suspended 상태이면 resume()을 시도한 뒤 재생한다.
 */
export function playNotificationSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // 브라우저 자동재생 차단 정책으로 suspended 상태일 수 있음 — resume 시도
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  // 1음: 880 Hz (A5) — 0.0초 ~ 0.15초 구간 재생
  playTone(ctx, 880, 0.0, 0.15);
  // 2음: 1100 Hz (약 C#6) — 0.15초 ~ 0.35초 구간 재생
  playTone(ctx, 1100, 0.15, 0.35);
}

/**
 * 단일 사인파 톤 재생 헬퍼.
 * OscillatorNode와 GainNode를 조합하여 부드러운 페이드 인/아웃을 구현한다.
 * 페이드 처리를 하지 않으면 시작/끝에 '딸깍' 소리(클리핑)가 발생한다.
 *
 * @param ctx         - 공유 AudioContext 인스턴스
 * @param frequency   - 재생할 주파수 (Hz) — 440 = A4(라), 880 = A5, 1100 = 약 C#6
 * @param startOffset - ctx.currentTime 기준 재생 시작 오프셋 (초)
 * @param endOffset   - ctx.currentTime 기준 재생 종료 오프셋 (초)
 */
function playTone(
  ctx: AudioContext,
  frequency: number,
  startOffset: number,
  endOffset: number,
): void {
  // 사인파 발진기 — 부드럽고 깨끗한 단순 음색
  const oscillator = ctx.createOscillator();
  // 볼륨 제어 노드 — 페이드 인/아웃 처리
  const gainNode = ctx.createGain();

  // 신호 흐름: oscillator → gainNode → 스피커(destination)
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  // 사인파(sine): 배음 없이 순수한 단일 주파수 — 알림음에 적합
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + startOffset);

  // 페이드 인: 시작 시 볼륨 0 → 0.05초 동안 0.3으로 부드럽게 올림
  gainNode.gain.setValueAtTime(0, ctx.currentTime + startOffset);
  gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + startOffset + 0.05);
  // 페이드 아웃: 종료 시점에 볼륨을 0으로 낮춰 클리핑 방지
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + endOffset);

  oscillator.start(ctx.currentTime + startOffset);
  oscillator.stop(ctx.currentTime + endOffset);
}
