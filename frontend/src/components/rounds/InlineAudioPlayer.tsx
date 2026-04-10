// 라운드 퀴즈용 인라인 오디오 플레이어 — 단일 트랙 재생
'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchStreamUrl } from '@/services/api/audio';

interface Props {
  audioId: string;
  fileName: string;
}

export function InlineAudioPlayer({ audioId, fileName }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);

  // audioId 변경 시 stream URL 재발급
  useEffect(() => {
    setStreamUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setLoading(true);
    fetchStreamUrl(audioId)
      .then((url) => setStreamUrl(url))
      .catch(() => setStreamUrl(null))
      .finally(() => setLoading(false));
  }, [audioId]);

  function toggle() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    if (!audioRef.current) return;
    const t = parseFloat(e.target.value);
    audioRef.current.currentTime = t;
    setCurrentTime(t);
  }

  function fmt(sec: number) {
    if (!isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rounded-lg border border-[#E8E5DE] bg-[#F5F5EF] p-3">
      <p className="mb-2 truncate text-xs font-medium text-[#6B6B7B]" title={fileName}>
        {fileName}
      </p>

      {streamUrl && (
        <audio
          ref={audioRef}
          src={streamUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      <div className="flex items-center gap-3">
        <Button
          variant="default"
          size="icon-sm"
          onClick={toggle}
          disabled={!streamUrl || loading}
          className="bg-[#2D7D7B] text-white hover:bg-[#236968] shrink-0"
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>

        <div className="relative flex-1">
          <div className="h-1.5 w-full rounded-full bg-[#E8E5DE]">
            <div
              className="h-1.5 rounded-full bg-[#2D7D7B] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 h-1.5 w-full cursor-pointer opacity-0"
          />
        </div>

        <span className="text-xs tabular-nums text-[#9B9B9B] shrink-0">
          {fmt(currentTime)} / {fmt(duration)}
        </span>
      </div>
    </div>
  );
}
