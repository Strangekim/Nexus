// 오디오 검색바 — 자연어 입력 + 디바운스

'use client';

import { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface AudioSearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function AudioSearchBar({ onSearch, isLoading }: AudioSearchBarProps) {
  const [value, setValue] = useState('');

  // 300ms 디바운스
  useEffect(() => {
    const timer = setTimeout(() => onSearch(value.trim()), 300);
    return () => clearTimeout(timer);
  }, [value, onSearch]);

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9B9B9B]">
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Search className="size-4" />
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="자연어로 사운드 검색... (예: 비 오는 도시 골목 분위기)"
        className="w-full rounded-lg border border-[#E8E5DE] bg-white px-10 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#9B9B9B] focus:border-[#2D7D7B] focus:outline-none focus:ring-1 focus:ring-[#2D7D7B]"
      />
      {value && (
        <button
          onClick={() => setValue('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B9B9B] hover:text-[#1A1A1A]"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
