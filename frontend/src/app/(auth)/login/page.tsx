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
    <div
      className="w-full max-w-sm rounded-xl p-8 shadow-2xl"
      style={{ backgroundColor: '#16213E' }}
    >
      {/* 브랜드 그라데이션 상단 액센트 */}
      <div
        className="mx-auto mb-6 h-1 w-16 rounded-full"
        style={{
          background:
            'linear-gradient(135deg, #1B605B 0%, #8A9A5E 40%, #DFA770 70%, #E0845E 100%)',
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
        <div
          className="mb-4 rounded-lg px-3 py-2 text-sm"
          style={{ backgroundColor: '#2A1525', color: '#E0845E' }}
        >
          {error}
        </div>
      )}

      {/* 로그인 폼 */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-sm font-medium"
            style={{ color: '#E8E8ED' }}
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
            className="h-10"
            style={{
              backgroundColor: '#1E1E32',
              borderColor: '#2A2A3E',
              color: '#E8E8ED',
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-sm font-medium"
            style={{ color: '#E8E8ED' }}
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
            className="h-10"
            style={{
              backgroundColor: '#1E1E32',
              borderColor: '#2A2A3E',
              color: '#E8E8ED',
            }}
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 h-10 w-full text-sm font-medium"
          style={{
            backgroundColor: '#2D7D7B',
            color: '#FFFFFF',
          }}
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
