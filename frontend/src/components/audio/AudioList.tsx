// 오디오 목록 — 검색 결과 또는 카테고리 필터 목록

'use client';

import { useState } from 'react';
import { AudioCard } from './AudioCard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import type { AudioAsset, AudioSearchResult } from '@/services/api/audio';

/** 검색 모드 기본 표시 수 */
const SEARCH_PAGE_SIZE = 30;

interface AudioListProps {
  items: (AudioAsset | AudioSearchResult)[];
  isLoading?: boolean;
  /** 페이지네이션 (목록 모드) */
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  /** 검색 모드 여부 */
  isSearchMode?: boolean;
}

export function AudioList({
  items,
  isLoading,
  page,
  totalPages,
  onPageChange,
  isSearchMode,
}: AudioListProps) {
  const [visibleCount, setVisibleCount] = useState(SEARCH_PAGE_SIZE);

  // 검색 모드에서 보여줄 아이템
  const displayItems = isSearchMode ? items.slice(0, visibleCount) : items;
  const hasMore = isSearchMode && items.length > visibleCount;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg border border-[#E8E5DE] bg-[#F5F5EF]"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[#9B9B9B]">
        <p className="text-sm">
          {isSearchMode ? '검색 결과가 없습니다' : '오디오 파일이 없습니다'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {displayItems.map((item) => (
          <AudioCard key={item.id} asset={item} />
        ))}
      </div>

      {/* 검색 모드: 더보기 버튼 */}
      {isSearchMode && hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount((prev) => prev + SEARCH_PAGE_SIZE)}
            className="text-[#6B6B7B]"
          >
            더보기 ({items.length - visibleCount}개 남음)
            <ChevronDown className="ml-1 size-3.5" />
          </Button>
        </div>
      )}

      {/* 목록 모드: 페이지네이션 */}
      {!isSearchMode && page && totalPages && totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="text-[#6B6B7B]"
          >
            <ChevronLeft className="size-3.5" />
            이전
          </Button>
          <span className="text-xs text-[#9B9B9B]">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="text-[#6B6B7B]"
          >
            다음
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
