// 인증 미들웨어 — 쿠키 존재 여부로 보호 라우트 체크

import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('connect.sid');
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');

  // 세션 없이 보호 페이지 접근 시 로그인으로 리다이렉트
  if (!sessionCookie && !isAuthPage) {
    const redirectUrl = new URL(
      `/login?redirect=${request.nextUrl.pathname}`,
      request.url,
    );
    return NextResponse.redirect(redirectUrl);
  }

  // 세션 있는 상태에서 로그인 페이지 접근 시 메인으로 리다이렉트
  if (sessionCookie && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png).*)'],
};
