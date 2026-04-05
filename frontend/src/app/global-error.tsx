'use client';
// 글로벌 에러 페이지 — 레이아웃 에러 시 표시 (provider 의존성 없이 순수 렌더링)

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="ko">
      <body>
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>오류가 발생했습니다</h2>
          <button onClick={reset} style={{ padding: '8px 24px', borderRadius: '8px', backgroundColor: '#2D7D7B', color: 'white', border: 'none', cursor: 'pointer' }}>
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
