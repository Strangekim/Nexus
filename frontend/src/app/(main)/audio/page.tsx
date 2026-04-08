// 오디오 라이브러리 메인 페이지 — 탭 기반 카테고리 드릴다운 + 멀티모달 검색

'use client';

import { useState, useCallback } from 'react';
import { AudioSearchBar, type SearchModality } from '@/components/audio/AudioSearchBar';
import { CategoryTabs } from '@/components/audio/CategoryTabs';
import { AudioList } from '@/components/audio/AudioList';
import { useAudioList, useAudioSearch, useAudioStats } from '@/hooks/useAudio';
import { MAJOR_LABELS } from '@/lib/audio-taxonomy';
import { Music } from 'lucide-react';

export default function AudioPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchModality, setSearchModality] = useState<SearchModality>('text');
  const [searchMimeType, setSearchMimeType] = useState<string | undefined>();
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [selectedMid, setSelectedMid] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const isSearchMode = searchQuery.trim().length > 0;

  // 통계
  const { data: stats } = useAudioStats();

  // 현재 필터 조합
  const filters = {
    ...(selectedMajor ? { major: selectedMajor } : {}),
    ...(selectedMid ? { mid: selectedMid } : {}),
    ...(selectedSub ? { sub: selectedSub } : {}),
  };
  const hasFilters = Object.keys(filters).length > 0;

  // 멀티모달 검색 결과
  const {
    data: searchResults,
    isLoading: searchLoading,
  } = useAudioSearch(
    searchQuery,
    searchModality,
    hasFilters ? filters : undefined,
    100,
    searchMimeType,
  );

  // 목록 (검색 모드가 아닐 때)
  const {
    data: listData,
    isLoading: listLoading,
  } = useAudioList({
    major: selectedMajor ?? undefined,
    mid: selectedMid ?? undefined,
    sub: selectedSub ?? undefined,
    page,
    limit: 30,
  });

  const handleSearch = useCallback((q: string, modality: SearchModality, mimeType?: string) => {
    setSearchQuery(q);
    setSearchModality(modality);
    setSearchMimeType(mimeType);
    setPage(1);
  }, []);

  const handleSelectMajor = useCallback((major: string | null) => {
    setSelectedMajor(major);
    setSelectedMid(null);
    setSelectedSub(null);
    setPage(1);
  }, []);

  const handleSelectMid = useCallback((mid: string | null) => {
    setSelectedMid(mid);
    setSelectedSub(null);
    setPage(1);
  }, []);

  const handleSelectSub = useCallback((sub: string | null) => {
    setSelectedSub(sub);
    setPage(1);
  }, []);

  // 현재 카테고리 경로 텍스트
  const categoryLabel = selectedMajor
    ? [
        MAJOR_LABELS[selectedMajor] || selectedMajor,
        selectedMid?.replace(/_/g, ' '),
        selectedSub?.replace(/_/g, ' '),
      ].filter(Boolean).join(' > ')
    : '전체';

  // 검색 모드 라벨
  const searchLabel = searchModality === 'text'
    ? `"${searchQuery}" 검색 결과`
    : searchModality === 'image'
      ? '이미지 검색 결과'
      : '영상 검색 결과';

  return (
    <div className="flex flex-col h-full">
      {/* 상단 고정 영역 */}
      <div className="shrink-0 border-b border-[#E8E5DE] bg-white">
        {/* 헤더 + 검색바 */}
        <div className="mx-auto max-w-5xl px-4 pt-5 pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-[#1A1A1A] flex items-center gap-2">
              <Music className="size-5 text-[#2D7D7B]" />
              오디오 라이브러리
            </h1>
            {stats && (
              <span className="text-xs text-[#9B9B9B]">
                총 {stats.total.toLocaleString()}개
              </span>
            )}
          </div>
          <AudioSearchBar onSearch={handleSearch} isLoading={searchLoading} />
        </div>

        {/* 카테고리 탭 */}
        <div className="mx-auto max-w-5xl px-4">
          <CategoryTabs
            selectedMajor={selectedMajor}
            selectedMid={selectedMid}
            selectedSub={selectedSub}
            onSelectMajor={handleSelectMajor}
            onSelectMid={handleSelectMid}
            onSelectSub={handleSelectSub}
          />
        </div>
      </div>

      {/* 목록 영역 */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-4 py-4 space-y-3">
          {/* 결과 헤더 */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#6B6B7B]">
              {isSearchMode
                ? `${searchLabel} ${searchResults?.length ?? 0}건`
                : `${categoryLabel} — ${listData?.total ?? 0}개`}
              {isSearchMode && hasFilters && (
                <span className="text-[#9B9B9B]"> ({categoryLabel} 내)</span>
              )}
            </p>
          </div>

          {/* 오디오 목록 */}
          {isSearchMode ? (
            <AudioList
              items={searchResults ?? []}
              isLoading={searchLoading}
              isSearchMode
            />
          ) : (
            <AudioList
              items={listData?.items ?? []}
              isLoading={listLoading}
              page={page}
              totalPages={listData?.totalPages}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
