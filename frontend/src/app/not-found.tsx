// Next.js 404 Not Found 페이지
import Link from 'next/link';
import Image from 'next/image';
import { Home } from 'lucide-react';

/** 존재하지 않는 경로 접근 시 표시되는 404 페이지 */
export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5EF' }}>
      <div className="text-center px-6 py-10 max-w-md">
        {/* Nexus 로고 */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo.png"
            alt="Nexus 로고"
            width={120}
            height={40}
            className="object-contain"
            priority
          />
        </div>

        {/* 404 표시 */}
        <div
          className="text-6xl font-bold mb-4"
          style={{ color: '#E0845E' }}
        >
          404
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          요청하신 페이지가 존재하지 않거나
          <br />
          이동되었을 수 있습니다.
        </p>

        {/* 홈으로 돌아가기 */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-85"
          style={{ backgroundColor: '#2D7D7B' }}
        >
          <Home size={16} />
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
