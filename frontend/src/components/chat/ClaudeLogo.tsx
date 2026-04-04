// Claude 로고 SVG 컴포넌트 — 스파클/별 모양 + 스트리밍 시 펄스 애니메이션

'use client';

interface ClaudeLogoProps {
  size?: number;
  isAnimating?: boolean;
}

/**
 * Claude 공식 스파클 마크를 SVG로 구현.
 * isAnimating=true 시 부드러운 숨쉬기(펄스) 글로우 효과 적용.
 */
export function ClaudeLogo({ size = 20, isAnimating = false }: ClaudeLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={isAnimating ? 'animate-claude-pulse' : ''}
    >
      {/* 글로우 필터 — 애니메이션 시 빛나는 효과 */}
      {isAnimating && (
        <defs>
          <filter id="claude-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}
      {/* 6갈래 둥근 별 모양 — Claude 스파클 마크 */}
      <g filter={isAnimating ? 'url(#claude-glow)' : undefined}>
        {/* 중앙 원 */}
        <circle cx="12" cy="12" r="2.2" fill="#E0845E" />
        {/* 상단 꽃잎 */}
        <ellipse cx="12" cy="5.5" rx="1.8" ry="3.8" fill="#E0845E" />
        {/* 하단 꽃잎 */}
        <ellipse cx="12" cy="18.5" rx="1.8" ry="3.8" fill="#E0845E" />
        {/* 우상단 꽃잎 */}
        <ellipse cx="17.6" cy="8.8" rx="1.8" ry="3.8" fill="#E0845E" transform="rotate(60 17.6 8.8)" />
        {/* 좌하단 꽃잎 */}
        <ellipse cx="6.4" cy="15.2" rx="1.8" ry="3.8" fill="#E0845E" transform="rotate(60 6.4 15.2)" />
        {/* 우하단 꽃잎 */}
        <ellipse cx="17.6" cy="15.2" rx="1.8" ry="3.8" fill="#E0845E" transform="rotate(-60 17.6 15.2)" />
        {/* 좌상단 꽃잎 */}
        <ellipse cx="6.4" cy="8.8" rx="1.8" ry="3.8" fill="#E0845E" transform="rotate(-60 6.4 8.8)" />
      </g>

      {/* 펄스 애니메이션 키프레임 — 글로벌 스타일 주입 */}
      {isAnimating && (
        <style>{`
          @keyframes claude-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.75; transform: scale(1.08); }
          }
          .animate-claude-pulse {
            animation: claude-pulse 2s ease-in-out infinite;
            transform-origin: center;
          }
        `}</style>
      )}
    </svg>
  );
}
