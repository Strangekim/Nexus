'use client';
// Next.js 페이지 레벨 에러 처리 — React Error Boundary 래퍼

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** 페이지 수준 에러 발생 시 표시되는 폴백 UI */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // 에러 로그 기록 — 운영 환경에서는 외부 모니터링 서비스로 전송 가능
    console.error('[ErrorPage] 페이지 에러 발생:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5EF' }}>
      <div className="text-center px-6 py-10 max-w-md">
        {/* 경고 아이콘 */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: '#FDE8DF' }}
        >
          <AlertTriangle size={28} color="#E0845E" />
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          문제가 발생했습니다
        </h1>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          예상치 못한 오류가 발생했습니다.
          <br />
          잠시 후 다시 시도해 주세요.
        </p>

        {/* 에러 다이제스트 표시 (디버깅용) */}
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4 font-mono">
            오류 코드: {error.digest}
          </p>
        )}

        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-85"
          style={{ backgroundColor: '#E0845E' }}
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
