'use client';

// 로그인 페이지

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { login } from '@/services/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';

  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const user = await login(email, password);
      setUser(user);
      router.push(redirectTo);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('로그인에 실패했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-sm rounded-2xl border border-[#E8E5DE] bg-white p-8 shadow-lg">
      {/* 브랜드 그라데이션 상단 액센트 */}
      <div
        className="mx-auto mb-6 h-1 w-16 rounded-full"
        style={{
          background:
            'linear-gradient(135deg, #2D7D7B 0%, #5A9A8A 40%, #DFA770 70%, #E0845E 100%)',
        }}
      />

      {/* 로고 */}
      <div className="mb-6 flex justify-center">
        <Image
          src="/logo.png"
          alt="Nexus"
          width={120}
          height={40}
          priority
        />
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 rounded-lg bg-[#FEF2EE] px-3 py-2 text-sm text-[#E0845E]">
          {error}
        </div>
      )}

      {/* 로그인 폼 */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-sm font-medium text-[#3D3D3D]"
          >
            이메일
          </label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isSubmitting}
            className="h-10 border-[#E8E5DE] bg-[#F9F9F4] text-[#1A1A1A] placeholder:text-[#B0AFA8]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-sm font-medium text-[#3D3D3D]"
          >
            비밀번호
          </label>
          <Input
            id="password"
            type="password"
            placeholder="비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isSubmitting}
            className="h-10 border-[#E8E5DE] bg-[#F9F9F4] text-[#1A1A1A] placeholder:text-[#B0AFA8]"
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 h-10 w-full cursor-pointer text-sm font-medium bg-[#2D7D7B] text-white hover:bg-[#256664]"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            '로그인'
          )}
        </Button>
      </form>
    </div>
  );
}
