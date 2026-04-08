// 오디오 플레이어 전역 상태 스토어

import { create } from 'zustand';
import type { AudioAsset, AudioSearchResult } from '@/services/api/audio';

type PlayableAsset = AudioAsset | AudioSearchResult;

interface AudioState {
  /** 현재 재생 중인 트랙 */
  currentTrack: PlayableAsset | null;
  /** 현재 스트리밍 URL */
  streamUrl: string | null;
  /** 재생 여부 */
  isPlaying: boolean;

  // 액션
  playTrack: (track: PlayableAsset, url: string) => void;
  togglePlay: () => void;
  stop: () => void;
}

/** 오디오 플레이어 전역 스토어 — 페이지 이동해도 재생 유지 */
export const useAudioStore = create<AudioState>()((set) => ({
  currentTrack: null,
  streamUrl: null,
  isPlaying: false,

  playTrack: (track, url) =>
    set({ currentTrack: track, streamUrl: url, isPlaying: true }),

  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

  stop: () => set({ currentTrack: null, streamUrl: null, isPlaying: false }),
}));
