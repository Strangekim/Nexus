// Nexus AI 로고 SVG 컴포넌트 — 6갈래 V자 꽃잎 + Teal→Coral 그라데이션
// 스트리밍 시 각 꽃잎이 순차적으로 빛나는 애니메이션 적용

'use client';

interface ClaudeLogoProps {
  size?: number;
  isAnimating?: boolean;
}

/**
 * Nexus 파비콘을 SVG로 재현한 AI 프로필 로고.
 * 6갈래 V자(갈매기) 형태 꽃잎이 방사형 배치, Teal→Coral 그라데이션.
 * isAnimating=true 시 각 꽃잎이 순차적으로 빛나며 천천히 회전하는 애니메이션 적용.
 */
export function ClaudeLogo({ size = 20, isAnimating = false }: ClaudeLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={isAnimating ? 'nexus-logo-spinning' : ''}
    >
      <defs>
        {/* 각 꽃잎마다 다른 그라데이션 — 시계방향으로 Teal에서 Coral로 전환 */}
        <linearGradient id="nx-g0" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#2D7D7B" />
          <stop offset="100%" stopColor="#4A9A6B" />
        </linearGradient>
        <linearGradient id="nx-g1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4A9A6B" />
          <stop offset="100%" stopColor="#8BB05E" />
        </linearGradient>
        <linearGradient id="nx-g2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8BB05E" />
          <stop offset="100%" stopColor="#C49058" />
        </linearGradient>
        <linearGradient id="nx-g3" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C49058" />
          <stop offset="100%" stopColor="#E0845E" />
        </linearGradient>
        <linearGradient id="nx-g4" x1="1" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#E0845E" />
          <stop offset="100%" stopColor="#D8916A" />
        </linearGradient>
        <linearGradient id="nx-g5" x1="1" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#D8916A" />
          <stop offset="100%" stopColor="#2D7D7B" />
        </linearGradient>

        {/* 글로우 필터 — 애니메이션 시 빛나는 효과 */}
        {isAnimating && (
          <filter id="nx-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {/*
        6갈래 V자(갈매기) 꽃잎 — 중심(50,50)에서 방사형 배치
        각 꽃잎은 60도 간격 회전, V자 모양은 두 팔이 바깥으로 벌어지는 형태
        strokeLinecap="round"로 끝부분을 둥글게 처리
      */}
      <g filter={isAnimating ? 'url(#nx-glow)' : undefined}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g
            key={i}
            transform={`rotate(${i * 60} 50 50)`}
            className={isAnimating ? `nexus-petal nexus-petal-${i}` : ''}
          >
            {/* V자 왼쪽 팔 */}
            <line
              x1="50" y1="50"
              x2="38" y2="14"
              stroke={`url(#nx-g${i})`}
              strokeWidth="7"
              strokeLinecap="round"
            />
            {/* V자 오른쪽 팔 */}
            <line
              x1="50" y1="50"
              x2="62" y2="14"
              stroke={`url(#nx-g${i})`}
              strokeWidth="7"
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>

      {/* 애니메이션 키프레임 */}
      {isAnimating && (
        <style>{`
          .nexus-logo-spinning {
            animation: nexus-spin 6s linear infinite;
            transform-origin: center;
          }
          @keyframes nexus-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .nexus-petal {
            animation: nexus-glow 1.8s ease-in-out infinite;
          }
          .nexus-petal-0 { animation-delay: 0s; }
          .nexus-petal-1 { animation-delay: 0.3s; }
          .nexus-petal-2 { animation-delay: 0.6s; }
          .nexus-petal-3 { animation-delay: 0.9s; }
          .nexus-petal-4 { animation-delay: 1.2s; }
          .nexus-petal-5 { animation-delay: 1.5s; }
          @keyframes nexus-glow {
            0%, 100% { opacity: 0.5; }
            33% { opacity: 1; }
          }
        `}</style>
      )}
    </svg>
  );
}
