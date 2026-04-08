// 오디오 검색바 — 자연어 입력 + 이미지/영상 업로드 검색

'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Image, Film } from 'lucide-react';

/** 검색 모달리티 */
export type SearchModality = 'text' | 'image' | 'video';

interface AudioSearchBarProps {
  onSearch: (query: string, modality: SearchModality, mimeType?: string) => void;
  isLoading?: boolean;
}

export function AudioSearchBar({ onSearch, isLoading }: AudioSearchBarProps) {
  const [value, setValue] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; modality: SearchModality } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 텍스트 검색 300ms 디바운스
  useEffect(() => {
    if (uploadedFile) return; // 파일 업로드 중엔 디바운스 안 함
    const timer = setTimeout(() => onSearch(value.trim(), 'text'), 300);
    return () => clearTimeout(timer);
  }, [value, onSearch, uploadedFile]);

  /** 파일을 base64로 변환 후 검색 */
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const modality = file.type.startsWith('video/') ? 'video' as const : 'image' as const;
    setUploadedFile({ name: file.name, modality });
    setValue('');

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      onSearch(base64, modality, file.type);
    };
    reader.readAsDataURL(file);

    // input 초기화 (같은 파일 재선택 가능)
    e.target.value = '';
  }

  /** 업로드 파일 제거 → 텍스트 모드로 복귀 */
  function clearFile() {
    setUploadedFile(null);
    onSearch('', 'text');
  }

  function clearAll() {
    setValue('');
    setUploadedFile(null);
    onSearch('', 'text');
  }

  return (
    <div className="space-y-2">
      <div className="relative flex gap-2">
        {/* 검색 입력 */}
        <div className="relative flex-1">
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
            onChange={(e) => { setValue(e.target.value); setUploadedFile(null); }}
            placeholder="자연어로 사운드 검색... (예: 비 오는 도시 골목 분위기)"
            disabled={!!uploadedFile}
            className="w-full rounded-lg border border-[#E8E5DE] bg-white px-10 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#9B9B9B] focus:border-[#2D7D7B] focus:outline-none focus:ring-1 focus:ring-[#2D7D7B] disabled:bg-[#F5F5EF] disabled:text-[#9B9B9B]"
          />
          {(value || uploadedFile) && (
            <button
              onClick={clearAll}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B9B9B] hover:text-[#1A1A1A]"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* 이미지/영상 업로드 버튼 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 flex items-center gap-1.5 rounded-lg border border-[#E8E5DE] bg-white px-3 py-2.5 text-xs text-[#6B6B7B] hover:border-[#2D7D7B] hover:text-[#2D7D7B] transition-colors"
          title="이미지 또는 영상으로 검색"
        >
          <Image className="size-4" />
          <span className="hidden sm:inline">/</span>
          <Film className="size-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* 업로드된 파일 표시 */}
      {uploadedFile && (
        <div className="flex items-center gap-2 rounded-md bg-[#2D7D7B]/10 px-3 py-1.5 text-xs text-[#2D7D7B]">
          {uploadedFile.modality === 'image' ? (
            <Image className="size-3.5" />
          ) : (
            <Film className="size-3.5" />
          )}
          <span className="truncate flex-1">
            {uploadedFile.modality === 'image' ? '이미지' : '영상'}로 검색 중: {uploadedFile.name}
          </span>
          <button onClick={clearFile} className="hover:text-[#1A1A1A]">
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
