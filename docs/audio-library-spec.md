# 오디오 라이브러리 기능 명세서

> 최종 수정: 2026-04-08

## 1. 개요

Nexus 플랫폼에 **팀 공유 오디오 라이브러리** 기능을 추가한다.
7,136개 사운드 에셋이 S3에 저장되고, pgvector 기반 3072차원 벡터 임베딩으로 **자연어 유사도 검색**을 지원한다.
팀원 누구나 웹 UI에서 사운드를 검색·탐색·미리듣기·다운로드할 수 있다.

### 핵심 가치
- **자연어 검색**: "비 오는 도시 골목 분위기" → 벡터 유사도로 관련 사운드 반환
- **카테고리 탐색**: 6-tier taxonomy 기반 트리 브라우징
- **즉시 재생**: S3 presigned URL로 브라우저 내 미리듣기
- **팀 공유**: 별도 설치 없이 Nexus 웹에서 전체 라이브러리 접근

---

## 2. 데이터 구조

### 2.1 오디오 에셋 (AudioAsset)

이미 Prisma 스키마에 정의됨 (`backend/prisma/schema.prisma`):

| 필드 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| fileName | VARCHAR(500) | 원본 파일명 |
| s3Key | VARCHAR(500) | S3 오브젝트 키 (UNIQUE) |
| major | VARCHAR(50) | 대분류 (6종) |
| mid | VARCHAR(100) | 중분류 |
| sub | VARCHAR(100)? | 소분류 (nullable) |
| mood | TEXT[] | 감정/분위기 태그 |
| tags | TEXT[] | 검색 키워드 |
| description | TEXT | 영어 한줄 설명 |
| bpm | INT? | 음악 BPM |
| instruments | TEXT[] | 악기 목록 |
| duration | FLOAT? | 길이(초) |
| format | VARCHAR(20) | wav/mp3/ogg/flac |
| fileSize | INT | 바이트 |
| embedding | vector(3072)? | Gemini Embedding 2 벡터 |

### 2.2 분류 체계 (Taxonomy)

6개 major 카테고리:

```
Dialogue_VO   — 대사, 내레이션, 군중대사, 안내방송
Music         — BGM, Stinger, Jingle, Drone/Pad, Score, Percussion
Ambience      — Nature, Urban, Interior, Exterior, Weather, Special
Foley         — Footsteps, Cloth, Body, Hand, Door, Furniture 등
Hard_SFX      — Impact, Crash, Explosion, Gunshot, Vehicle, Fire 등
Cinematic     — Riser, Hit, Whoosh, Drone, UI, Stab 등
```

상세 taxonomy: `tools/audio-pipeline/taxonomy.py` 참조

---

## 3. API 엔드포인트

기존 구현 (`backend/src/routes/audio/index.ts`)에 기능 보강이 필요하다.

### 3.1 기존 API (구현 완료)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/audio/search` | 멀티모달 벡터 유사도 검색 |
| GET | `/api/audio/categories` | 카테고리 트리 조회 |
| GET | `/api/audio/:id` | 단건 조회 + presigned URL |
| GET | `/api/audio` | 카테고리 필터 목록 (페이지네이션) |

### 3.2 추가/보강 필요 API

| 메서드 | 경로 | 설명 | 우선순위 |
|--------|------|------|----------|
| GET | `/api/audio/:id/stream` | 오디오 스트리밍용 presigned URL (짧은 TTL) | P0 |
| GET | `/api/audio/:id/download` | 다운로드용 presigned URL (Content-Disposition) | P0 |
| GET | `/api/audio/search/suggest` | 검색 자동완성 (tags, mood 기반) | P1 |
| POST | `/api/audio/batch` | 복수 에셋 일괄 조회 (ID 배열) | P1 |
| GET | `/api/audio/stats` | 라이브러리 통계 (총 개수, 카테고리별 분포) | P2 |

### 3.3 검색 API 상세 (`POST /api/audio/search`)

**요청:**
```json
{
  "query": "rain on a quiet city street",
  "modality": "text",
  "filters": {
    "major": "Ambience",
    "mid": "Urban"
  },
  "limit": 20
}
```

**응답:**
```json
{
  "results": [
    {
      "id": "uuid",
      "fileName": "city_rain_01.wav",
      "s3Key": "audio/ambience/urban/city-traffic/city_rain_01.wav",
      "major": "Ambience",
      "mid": "Urban",
      "sub": "City_Traffic",
      "mood": ["calm", "melancholic"],
      "tags": ["rain", "city", "street", "urban", "wet"],
      "description": "Light rain falling on an empty city street with distant traffic",
      "duration": 45.2,
      "similarity": 0.847,
      "s3Url": "https://your-bucket-name.s3.ap-northeast-2.amazonaws.com/..."
    }
  ]
}
```

### 3.4 인증

- 오디오 API는 Nexus 세션 인증을 공유한다 (httpOnly cookie)
- 로그인한 팀원이면 누구나 접근 가능 (role 제한 없음)
- presigned URL TTL: 스트리밍 5분, 다운로드 15분

---

## 4. 프론트엔드 UI

### 4.1 라우트 구조

```
/audio                    — 오디오 라이브러리 메인 (검색 + 카테고리)
/audio/category/:major    — 대분류별 목록
/audio/category/:major/:mid — 중분류별 목록
/audio/:id                — 에셋 상세 (선택, 모달로도 가능)
```

### 4.2 메인 페이지 (`/audio`)

```
┌─────────────────────────────────────────────────────┐
│  🔍 검색바 (자연어 입력)                              │
│  "비 오는 골목 분위기 효과음"                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [카테고리 필터 칩]                                   │
│  Dialogue_VO  Music  Ambience  Foley  Hard_SFX ...  │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  검색 결과 / 카테고리 목록                             │
│  ┌──────────────────────────────────────────┐       │
│  │ ▶ city_rain_01.wav     Ambience > Urban  │       │
│  │   "Light rain on city street..."  87%    │       │
│  │   [재생] [다운로드] [상세]                 │       │
│  ├──────────────────────────────────────────┤       │
│  │ ▶ rain_street_02.wav   Ambience > Weather│       │
│  │   "Heavy rain with thunder..."    82%    │       │
│  │   [재생] [다운로드] [상세]                 │       │
│  └──────────────────────────────────────────┘       │
│                                                     │
│  ──── 하단: 오디오 플레이어 바 ────                    │
│  ▶ city_rain_01.wav   ━━━━━━━●━━━━  01:23 / 02:45  │
│  🔊━━━━●━━  [⏮] [⏯] [⏭]                            │
└─────────────────────────────────────────────────────┘
```

### 4.3 핵심 UI 컴포넌트

| 컴포넌트 | 설명 |
|----------|------|
| `AudioSearchBar` | 자연어 검색 입력 + 자동완성 |
| `CategoryFilter` | major/mid/sub 필터 칩 |
| `AudioList` | 검색 결과 또는 카테고리 목록 (무한 스크롤 또는 페이지네이션) |
| `AudioCard` | 개별 에셋 카드 (파일명, 카테고리, 유사도, 액션 버튼) |
| `AudioPlayer` | 하단 고정 오디오 플레이어 (재생/일시정지, 탐색, 볼륨) |
| `AudioDetail` | 에셋 상세 정보 (모달 또는 페이지) |
| `WaveformDisplay` | 오디오 파형 시각화 (선택) |

### 4.4 상태 관리

```typescript
// zustand store
interface AudioStore {
  // 검색
  searchQuery: string;
  searchResults: AudioAsset[];
  isSearching: boolean;

  // 필터
  selectedMajor: string | null;
  selectedMid: string | null;
  selectedSub: string | null;

  // 플레이어
  currentTrack: AudioAsset | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;

  // 액션
  search: (query: string) => Promise<void>;
  setFilter: (major?: string, mid?: string, sub?: string) => void;
  playTrack: (asset: AudioAsset) => void;
  togglePlay: () => void;
  setVolume: (v: number) => void;
}
```

### 4.5 디자인 가이드라인

- 기존 Nexus 다크 테마 유지 (배경 `#1A1A2E`)
- 사이드바 네비게이션에 "오디오 라이브러리" 메뉴 항목 추가
- 카테고리 칩: Teal(`#2D7D7B`) 계열 배경
- 유사도 점수: 퍼센트 표시 + 컬러 바 (높을수록 Teal → 낮을수록 Coral)
- 오디오 플레이어: 하단 고정 바, Spotify/SoundCloud 스타일
- 반응형: 모바일에서는 카드 1열, 플레이어 미니모드

---

## 5. 사이드바 통합

기존 Nexus 사이드바 구조에 오디오 라이브러리 진입점을 추가한다.

```
사이드바 (기존)
├── 프로젝트 목록
│   ├── 폴더
│   │   └── 세션
│   └── 세션
├── ─────────────
├── 🔊 오디오 라이브러리    ← 추가
└── ⚙️ 설정
```

- 사이드바 하단 영역에 아이콘 + 텍스트로 배치
- 클릭 시 `/audio` 라우트로 이동
- 현재 위치가 `/audio/*`일 때 활성 상태 표시

---

## 6. 기술 요구사항

### 6.1 백엔드

- **pgvector**: `vector(3072)` 컬럼, 코사인 유사도 (`<=>` 연산자)
- **S3**: presigned URL 생성 (스트리밍/다운로드 분리)
- **Gemini Embedding 2**: 검색 쿼리 → 3072차원 벡터 변환
- **인덱스**: 7,000건 규모에서는 brute-force 검색으로 충분 (HNSW 불필요)
- **캐싱**: 카테고리 트리는 변경 빈도 낮으므로 메모리 캐싱 권장 (5분 TTL)

### 6.2 프론트엔드

- **TanStack Query**: 검색/목록/카테고리 API 호출
- **Zustand**: 오디오 플레이어 상태 (전역)
- **HTML5 Audio API**: 재생 제어
- **디바운스**: 검색 입력 300ms 디바운스
- **무한 스크롤 또는 페이지네이션**: 목록 조회 시

### 6.3 성능 목표

| 지표 | 목표 |
|------|------|
| 텍스트 검색 응답 | < 2초 (임베딩 생성 + DB 쿼리) |
| 카테고리 목록 응답 | < 200ms |
| 오디오 재생 시작 | < 1초 (presigned URL 발급 후) |
| 검색 결과 렌더링 | < 500ms |

---

## 7. 파이프라인 현황

현재 `tools/audio-pipeline/`에서 데이터 처리 중:

| 단계 | 상태 | 설명 |
|------|------|------|
| 분류 (classify) | ✅ 완료 | catalog.json → classify.jsonl (7,136건) |
| S3 업로드 (upload) | 🔄 진행중 | boto3 멀티파트 업로드 |
| 임베딩 (embed) | ⏳ 대기 | Gemini Embedding 2, 3072차원 |
| DB 적재 (insert) | ⏳ 대기 | pgvector INSERT + embedding |

파이프라인 완료 후 백엔드 API가 즉시 동작 가능하다.

---

## 8. 구현 우선순위

### Phase A: 기본 탐색 (P0)
1. 사이드바에 오디오 라이브러리 메뉴 추가
2. `/audio` 메인 페이지 — 카테고리 트리 브라우징
3. 오디오 목록 (카테고리 필터 + 페이지네이션)
4. 인라인 오디오 플레이어 (재생/일시정지)
5. 다운로드 기능

### Phase B: 자연어 검색 (P0)
1. 검색바 UI + 디바운스
2. 텍스트 검색 API 연동 (Gemini Embedding)
3. 검색 결과 목록 + 유사도 표시
4. 카테고리 필터와 검색 조합

### Phase C: 플레이어 고도화 (P1)
1. 하단 고정 오디오 플레이어 바
2. 재생 큐 / 연속 재생
3. 파형 시각화 (wavesurfer.js 등)
4. 볼륨/탐색 제어

### Phase D: 부가 기능 (P2)
1. 검색 자동완성
2. 즐겨찾기 / 최근 재생
3. 라이브러리 통계 대시보드
4. 일괄 다운로드 (ZIP)

---

## 9. 파일 구조 (예상)

```
frontend/src/
├── app/audio/
│   ├── page.tsx              — 메인 (검색 + 카테고리)
│   ├── layout.tsx            — 오디오 레이아웃 (플레이어 포함)
│   └── category/
│       └── [...slug]/
│           └── page.tsx      — 카테고리별 목록
├── components/audio/
│   ├── AudioSearchBar.tsx
│   ├── CategoryFilter.tsx
│   ├── AudioList.tsx
│   ├── AudioCard.tsx
│   ├── AudioPlayer.tsx
│   └── AudioDetail.tsx
├── hooks/
│   ├── useAudioSearch.ts     — TanStack Query 검색 훅
│   ├── useAudioList.ts       — TanStack Query 목록 훅
│   └── useAudioPlayer.ts    — 오디오 플레이어 훅
├── stores/
│   └── audioStore.ts         — Zustand 플레이어/검색 상태
└── lib/
    └── audioApi.ts           — API 함수 모음
```

---

## 10. 기존 코드 참조

| 파일 | 상태 | 역할 |
|------|------|------|
| `backend/src/routes/audio/index.ts` | 구현됨 | API 라우트 4개 |
| `backend/src/services/audio.service.ts` | 구현됨 | 검색/목록/카테고리 서비스 |
| `backend/src/lib/embedding.ts` | 구현됨 | Gemini Embedding 클라이언트 |
| `backend/src/lib/s3.ts` | 구현됨 | S3 presigned URL |
| `backend/prisma/schema.prisma` | 구현됨 | AudioAsset 모델 |
| `tools/audio-pipeline/` | 구현됨 | 데이터 처리 파이프라인 |
