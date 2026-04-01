---
name: nextjs-patterns
description: Next.js 14 App Router 코드 작성 패턴 (페이지, 레이아웃, 라우트 핸들러)
---
# Next.js App Router 코드 패턴

## 페이지 컴포넌트 (Server Component)
```tsx
// app/(main)/projects/page.tsx
// 서버 컴포넌트 — 'use client' 선언 없음
import { ProjectList } from '@/components/project/ProjectList';

// 데이터 페칭 함수
async function getProjects() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects`, {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('프로젝트 목록 조회 실패');
  return res.json();
}

export default async function ProjectsPage() {
  const data = await getProjects();
  return <ProjectList initialData={data} />;
}
```

## 클라이언트 컴포넌트
```tsx
// components/project/ProjectList.tsx
'use client';

import { useQuery } from '@tanstack/react-query';

interface Props {
  initialData: ProjectListResponse;
}

export function ProjectList({ initialData }: Props) {
  const { data } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    initialData,
  });

  return (
    <ul>
      {data.data.map((project) => (
        <li key={project.id}>{project.name}</li>
      ))}
    </ul>
  );
}
```

## 동적 라우트 페이지
```tsx
// app/(main)/projects/[projectId]/page.tsx
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  // projectId를 사용한 데이터 페칭
  return <div>프로젝트 상세</div>;
}
```

## 레이아웃
```tsx
// app/(main)/layout.tsx
import { Sidebar } from '@/components/sidebar/Sidebar';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
```

## API 라우트 핸들러 (프록시용)
```ts
// app/api/proxy/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const apiUrl = `${process.env.API_URL}/api/${path.join('/')}`;
  const res = await fetch(apiUrl, {
    headers: { cookie: request.headers.get('cookie') || '' },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

## 규칙
- 모든 주석은 한글로 작성
- `'use client'`는 상호작용이 필요한 컴포넌트에만 선언
- 데이터 페칭은 서버 컴포넌트에서 수행, 클라이언트 컴포넌트에 props로 전달
- `credentials: 'include'`로 세션 쿠키 자동 전송
- 파일 60~100줄 초과 시 컴포넌트 분리 검토
