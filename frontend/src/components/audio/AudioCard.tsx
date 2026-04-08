// 오디오 에셋 카드 — 파일명, 카테고리, 재생/다운로드 버튼

'use client';

import { useState } from 'react';
import { Play, Pause, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAudioStore } from '@/stores/audioStore';
import { fetchStreamUrl, fetchDownloadUrl } from '@/services/api/audio';
import type { AudioAsset, AudioSearchResult } from '@/services/api/audio';

type PlayableAsset = AudioAsset | AudioSearchResult;

interface AudioCardProps {
  asset: PlayableAsset;
}

export function AudioCard({ asset }: AudioCardProps) {
  const [loading, setLoading] = useState(false);
  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudioStore();
  const isCurrentTrack = currentTrack?.id === asset.id;
  const similarity = 'similarity' in asset ? (asset as AudioSearchResult).similarity : null;

  async function handlePlay() {
    if (isCurrentTrack) {
      togglePlay();
      return;
    }
    setLoading(true);
    try {
      const url = await fetchStreamUrl(asset.id);
      playTrack(asset, url);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    const url = await fetchDownloadUrl(asset.id);
    window.open(url, '_blank');
  }

  /** 파일 크기를 사람이 읽을 수 있는 형태로 변환 */
  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /** 초를 mm:ss 형태로 변환 */
  function formatDuration(sec: number | null) {
    if (!sec) return '--:--';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
        isCurrentTrack
          ? 'border-[#2D7D7B]/30 bg-[#2D7D7B]/5'
          : 'border-[#E8E5DE] bg-white hover:border-[#2D7D7B]/20'
      }`}
    >
      {/* 재생 버튼 */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handlePlay}
        disabled={loading}
        className={`shrink-0 ${isCurrentTrack && isPlaying ? 'text-[#2D7D7B]' : 'text-[#6B6B7B] hover:text-[#2D7D7B]'}`}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : isCurrentTrack && isPlaying ? (
          <Pause className="size-4" />
        ) : (
          <Play className="size-4" />
        )}
      </Button>

      {/* 파일 정보 */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#1A1A1A]">
          {asset.fileName}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-[#9B9B9B]">
            {asset.major} &gt; {asset.mid.replace(/_/g, ' ')}
            {asset.sub && ` > ${asset.sub.replace(/_/g, ' ')}`}
          </span>
        </div>
      </div>

      {/* 메타 정보 */}
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        {similarity !== null && (
          <Badge
            variant="default"
            className="text-[10px]"
            style={{
              backgroundColor: similarity > 0.7 ? '#2D7D7B' : similarity > 0.5 ? '#6B9E9D' : '#E0845E',
            }}
          >
            {Math.round(similarity * 100)}%
          </Badge>
        )}
        <span className="text-xs text-[#9B9B9B] w-10 text-right">
          {formatDuration(asset.duration)}
        </span>
        <span className="text-xs text-[#9B9B9B] w-14 text-right">
          {formatSize(asset.fileSize)}
        </span>
        <Badge variant="outline" className="text-[10px] uppercase">
          {asset.format}
        </Badge>
      </div>

      {/* 다운로드 버튼 */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleDownload}
        className="shrink-0 text-[#6B6B7B] hover:text-[#2D7D7B]"
      >
        <Download className="size-4" />
      </Button>
    </div>
  );
}
