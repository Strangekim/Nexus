import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 아바타 배경색 팔레트 — Teal~Coral 그라데이션 기반 */
const AVATAR_COLORS = ['#2D7D7B', '#E0845E', '#5B7D9A', '#7D6B2D', '#7D2D5B'];

/** 아바타 배경색 반환 — 이름 해시 기반으로 일관된 색상 선택 */
export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
