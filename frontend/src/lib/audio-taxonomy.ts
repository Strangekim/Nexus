/**
 * 오디오 분류 체계 — shared/audio-taxonomy.json 원천 데이터 기반
 * 이 파일은 JSON을 로드하여 타입 안전한 인터페이스를 제공한다.
 */

import taxonomyData from '@shared/audio-taxonomy.json';

export interface TaxonomyMid {
  name: string;
  subs: string[];
}

export interface TaxonomyMajor {
  key: string;
  label: string;
  mids: TaxonomyMid[];
}

/** JSON → 타입 변환 */
export const AUDIO_TAXONOMY: TaxonomyMajor[] = taxonomyData.categories.map((cat) => ({
  key: cat.key,
  label: cat.label,
  mids: Object.entries(cat.mids).map(([name, subs]) => ({ name, subs })),
}));

/** major key → label 매핑 */
export const MAJOR_LABELS: Record<string, string> = Object.fromEntries(
  AUDIO_TAXONOMY.map((t) => [t.key, t.label]),
);

/** 분류 체계 버전 */
export const TAXONOMY_VERSION = taxonomyData.version;
