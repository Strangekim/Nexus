// 골드셋 항목 카드 — 인라인 재생 가능
'use client';

import { useRef, useState } from 'react';
import { Pause, Play, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GoldSetItem } from '@/services/api/rounds';

interface Props {
  item: GoldSetItem;
}

export function GoldSetCard({ item }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  function toggle() {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play().catch(() => {});
  }

  function fmtDuration(sec: number | null) {
    if (!sec) return '';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div className="flex flex-col rounded-lg border border-[#E8E5DE] bg-white p-3 transition-colors hover:border-[#2D7D7B]/50">
      {/* 파일명 + 재생 */}
      <div className="flex items-start gap-2">
        <Button
          variant="default"
          size="icon-sm"
          onClick={toggle}
          className="bg-[#2D7D7B] text-white hover:bg-[#236968] shrink-0"
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#1A1A1A]" title={item.audioAsset.fileName}>
            {item.audioAsset.fileName}
          </p>
          <p className="text-xs text-[#9B9B9B]">
            {item.audioAsset.format.toUpperCase()} · {fmtDuration(item.audioAsset.duration)}
          </p>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={item.audioAsset.s3Url}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        preload="none"
      />

      {/* 분류 */}
      <div className="mt-2 rounded bg-[#2D7D7B]/10 px-2 py-1 text-xs text-[#2D7D7B]">
        {item.major} &gt; {item.mid.replace(/_/g, ' ')}
        {item.sub && ` > ${item.sub.replace(/_/g, ' ')}`}
      </div>

      {/* 설명 */}
      {item.audioAsset.description && (
        <p className="mt-2 line-clamp-2 text-xs text-[#6B6B7B]">
          {item.audioAsset.description}
        </p>
      )}

      {/* 태그 + 합의자 수 */}
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[#9B9B9B]">
        <div className="flex flex-wrap gap-1">
          {item.audioAsset.tags?.slice(0, 3).map((t) => (
            <span key={t} className="rounded bg-[#F5F5EF] px-1.5 py-0.5">
              {t}
            </span>
          ))}
        </div>
        <span className="flex items-center gap-1 shrink-0">
          <Users className="size-3" />
          {item.agreedBy.length}
        </span>
      </div>
    </div>
  );
}
