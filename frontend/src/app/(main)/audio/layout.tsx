// 오디오 라이브러리 레이아웃 — 하단 플레이어 포함

import { AudioPlayer } from '@/components/audio/AudioPlayer';

export default function AudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto">{children}</div>
      <AudioPlayer />
    </div>
  );
}
