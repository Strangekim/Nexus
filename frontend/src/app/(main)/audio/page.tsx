// 오디오 라이브러리 메인 페이지 — 검색 + 카테고리 + 목록

'use client';

import { useState, useCallback } from 'react';
import { AudioSearchBar } from '@/components/audio/AudioSearchBar';
import { CategoryFilter } from '@/components/audio/CategoryFilter';
import { AudioList } from '@/components/audio/AudioList';
import { useAudioCategories, useAudioList, useAudioSearch, useAudioStats } from '@/hooks/useAudio';
import { Music, Disc3, FileAudio } from 'lucide-react';

export default function AudioPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [selectedMid, setSelectedMid] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const isSearchMode = searchQuery.trim().length > 0;

  // 카테고리 트리
  const { data: categories, isLoading: catLoading } = useAudioCategories();

  // 통계
  const { data: stats } = useAudioStats();

  // 검색 결과
  const searchFilters = selectedMajor
    ? { major: selectedMajor, ...(selectedMid ? { mid: selectedMid } : {}) }
    : undefined;

  const {
    data: searchResults,
    isLoading: searchLoading,
  } = useAudioSearch(searchQuery, searchFilters);

  // 목록 (검색 모드가 아닐 때)
  const {
    data: listData,
    isLoading: listLoading,
  } = useAudioList({
    major: selectedMajor ?? undefined,
    mid: selectedMid ?? undefined,
    page,
    limit: 30,
  });

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    setPage(1);
  }, []);

  const handleSelectMajor = useCallback((major: string | null) => {
    setSelectedMajor(major);
    setPage(1);
  }, []);

  const handleSelectMid = useCallback((mid: string | null) => {
    setSelectedMid(mid);
    setPage(1);
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl font-semibold text-[#1A1A1A] flex items-center gap-2">
          <Music className="size-5 text-[#2D7D7B]" />
          오디오 라이브러리
        </h1>
        {stats && (
          <p className="mt-1 text-sm text-[#9B9B9B]">
            총 {stats.total.toLocaleString()}개 사운드 에셋
          </p>
        )}
      </div>

      {/* 통계 카드 */}
      {stats && !isSearchMode && !selectedMajor && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {stats.byMajor.map((item) => (
            <button
              key={item.major}
              onClick={() => handleSelectMajor(item.major)}
              className="flex flex-col items-center gap-1 rounded-lg border border-[#E8E5DE] bg-white p-3 transition-colors hover:border-[#2D7D7B]/30 hover:bg-[#2D7D7B]/5"
            >
              <CategoryIcon major={item.major} />
              <span className="text-xs font-medium text-[#1A1A1A]">
                {MAJOR_LABELS[item.major] || item.major}
              </span>
              <span className="text-[10px] text-[#9B9B9B]">
                {item.count.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 검색바 */}
      <AudioSearchBar
        onSearch={handleSearch}
        isLoading={searchLoading}
      />

      {/* 카테고리 필터 */}
      {categories && !catLoading && (
        <CategoryFilter
          categories={categories}
          selectedMajor={selectedMajor}
          selectedMid={selectedMid}
          onSelectMajor={handleSelectMajor}
          onSelectMid={handleSelectMid}
        />
      )}

      {/* 결과 헤더 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#6B6B7B]">
          {isSearchMode
            ? `검색 결과 ${searchResults?.length ?? 0}건`
            : `${listData?.total ?? 0}개 에셋`}
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
  );
}

/** major별 표시 이름 */
const MAJOR_LABELS: Record<string, string> = {
  Dialogue_VO: 'Dialogue / VO',
  Music: 'Music',
  Ambience: 'Ambience',
  Foley: 'Foley',
  Hard_SFX: 'Hard SFX',
  Cinematic: 'Cinematic',
};

/** major별 아이콘 */
function CategoryIcon({ major }: { major: string }) {
  const cls = 'size-5 text-[#2D7D7B]';
  switch (major) {
    case 'Music':
      return <Music className={cls} />;
    case 'Cinematic':
      return <Disc3 className={cls} />;
    default:
      return <FileAudio className={cls} />;
  }
}
