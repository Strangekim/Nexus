// 전역 에러 경계 컴포넌트 — React class component 기반

'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/** 전역 에러 경계 — 하위 컴포넌트에서 발생한 에러를 포착해 폴백 UI를 렌더링 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] 렌더링 오류 포착:', error, info);
  }

  /** 다시 시도 — 에러 상태를 초기화 */
  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            backgroundColor: '#F5F5EF',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              padding: '2.5rem',
              maxWidth: '400px',
            }}
          >
            {/* 경고 아이콘 */}
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#FDE8DF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#E0845E"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#1A1A1A',
                marginBottom: '0.5rem',
              }}
            >
              문제가 발생했습니다
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#6B6B6B',
                marginBottom: '1.5rem',
                lineHeight: 1.6,
              }}
            >
              예상치 못한 오류가 발생했습니다.
              <br />
              잠시 후 다시 시도해 주세요.
            </p>

            <button
              onClick={this.handleRetry}
              style={{
                backgroundColor: '#E0845E',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '0.625rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = '0.85';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = '1';
              }}
            >
              다시 시도
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
