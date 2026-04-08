// 하단 고정 오디오 플레이어 바

'use client';

import { useRef, useEffect, useState } from 'react';
import { Play, Pause, Square, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudioStore } from '@/stores/audioStore';

export function AudioPlayer() {
  const { currentTrack, streamUrl, isPlaying, togglePlay, stop } = useAudioStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);

  // 오디오 소스 변경
  useEffect(() => {
    if (!audioRef.current) return;
    if (streamUrl) {
      audioRef.current.src = streamUrl;
      audioRef.current.volume = volume;
      audioRef.current.play().catch(() => {});
    }
  }, [streamUrl]);

  // 재생/일시정지 동기화
  useEffect(() => {
    if (!audioRef.current || !streamUrl) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, streamUrl]);

  // 볼륨 동기화
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  function handleTimeUpdate() {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  }

  function handleLoadedMetadata() {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }

  function handleEnded() {
    useAudioStore.getState().stop();
    setCurrentTime(0);
  }

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="border-t border-[#E8E5DE] bg-white px-4 py-2">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* 프로그레스 바 */}
      <div className="relative mb-2">
        <div className="h-1 w-full rounded-full bg-[#E8E5DE]">
          <div
            className="h-1 rounded-full bg-[#2D7D7B] transition-all"
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
          className="absolute inset-0 h-1 w-full cursor-pointer opacity-0"
        />
      </div>

      <div className="flex items-center gap-3">
        {/* 컨트롤 */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={togglePlay}
            className="text-[#1A1A1A] hover:text-[#2D7D7B]"
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={stop}
            className="text-[#6B6B7B] hover:text-[#E0845E]"
          >
            <Square className="size-3.5" />
          </Button>
        </div>

        {/* 트랙 정보 */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#1A1A1A]">
            {currentTrack.fileName}
          </p>
          <p className="text-xs text-[#9B9B9B]">
            {currentTrack.major} &gt; {currentTrack.mid.replace(/_/g, ' ')}
          </p>
        </div>

        {/* 시간 */}
        <span className="text-xs text-[#9B9B9B] tabular-nums shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* 볼륨 */}
        <div className="hidden sm:flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMuted(!muted)}
            className="text-[#6B6B7B] hover:text-[#1A1A1A]"
          >
            {muted || volume === 0 ? (
              <VolumeX className="size-4" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </Button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
              setMuted(false);
            }}
            className="w-16 accent-[#2D7D7B]"
          />
        </div>
      </div>
    </div>
  );
}
