# Phase 5: 오디오 라이브러리 구현 계획

> 상위 문서: `docs/audio-library-spec.md`

## 개요

Nexus에 팀 공유 오디오 라이브러리 기능을 추가한다.
pgvector 기반 자연어 검색 + S3 스트리밍으로 7,136개 사운드 에셋에 접근한다.

---

## Phase A: 기본 탐색 (백엔드 보강 + 프론트 기본)

### A-1. 백엔드 API 보강
- **파일**: `backend/src/routes/audio/index.ts`, `backend/src/services/audio.service.ts`
- **작업**:
  - `GET /api/audio/:id/stream` — 스트리밍용 presigned URL (TTL 5분)
  - `GET /api/audio/:id/download` — 다운로드용 presigned URL (Content-Disposition 헤더)
  - `POST /api/audio/batch` — ID 배열로 복수 에셋 조회
  - 기존 `listAudio`에 정렬 옵션 추가 (이름순, 최신순, 크기순)
- **의존성**: 파이프라인 DB 적재 완료 후 동작 확인 가능
- **충돌 파일**: `audio/index.ts`, `audio.service.ts`

### A-2. 사이드바 메뉴 추가
- **파일**: `frontend/src/components/sidebar/` (기존 사이드바 컴포넌트)
- **작업**:
  - 사이드바 하단에 "오디오 라이브러리" 아이콘 + 텍스트 추가
  - lucide-react `Music` 또는 `Volume2` 아이콘
  - 활성 라우트 하이라이트 (`/audio/*`)
- **충돌 파일**: 사이드바 레이아웃 파일

### A-3. 오디오 메인 페이지 — 카테고리 브라우징
- **파일**: `frontend/src/app/audio/page.tsx`, `layout.tsx`
- **작업**:
  - `/audio` 라우트 생성
  - `GET /api/audio/categories` 호출 → 카테고리 트리 렌더링
  - major 카테고리 카드 6개 (아이콘 + 에셋 개수)
  - 카테고리 클릭 → 해당 major/mid 필터 목록
- **의존성**: A-1 (API)
- **병렬 가능**: A-2와 병렬

### A-4. 오디오 목록 + 카드 컴포넌트
- **파일**: `frontend/src/components/audio/AudioList.tsx`, `AudioCard.tsx`
- **작업**:
  - 에셋 카드: 파일명, 카테고리 경로, duration, format 표시
  - 카테고리 필터 칩 (major/mid/sub 선택)
  - 페이지네이션 (TanStack Query + `useAudioList` 훅)
  - 빈 상태 / 로딩 스켈레톤
- **의존성**: A-3 (페이지)

### A-5. 인라인 오디오 재생
- **파일**: `frontend/src/components/audio/AudioPlayer.tsx`, `frontend/src/hooks/useAudioPlayer.ts`
- **작업**:
  - 카드의 재생 버튼 클릭 → presigned URL 로드 → `<audio>` 엘리먼트 재생
  - 재생/일시정지 토글
  - 기본 프로그레스 바
- **의존성**: A-4 (카드)

### A-6. 다운로드 기능
- **파일**: `AudioCard.tsx` (다운로드 버튼 추가)
- **작업**:
  - 다운로드 버튼 → `GET /api/audio/:id/download` → 브라우저 다운로드
- **의존성**: A-1 (download API)

**Phase A 병렬 구조:**
```
A-1 (백엔드) ─┬─ A-3 (메인 페이지) ─── A-4 (목록) ─┬─ A-5 (재생)
              │                                     └─ A-6 (다운로드)
A-2 (사이드바) ┘
```

---

## Phase B: 자연어 검색

### B-1. 검색 API 연동 훅
- **파일**: `frontend/src/hooks/useAudioSearch.ts`, `frontend/src/lib/audioApi.ts`
- **작업**:
  - `POST /api/audio/search` 호출 TanStack Query 훅
  - 300ms 디바운스
  - 검색 중 로딩 상태, 에러 핸들링
- **의존성**: Phase A 완료

### B-2. 검색바 UI
- **파일**: `frontend/src/components/audio/AudioSearchBar.tsx`
- **작업**:
  - 텍스트 입력 + 검색 아이콘
  - 디바운스 적용
  - 검색 진행 중 스피너
  - Enter 또는 디바운스 후 자동 검색
- **의존성**: B-1

### B-3. 검색 결과 표시
- **파일**: `AudioList.tsx` 확장
- **작업**:
  - 검색 모드: 유사도(%) 컬럼 추가
  - 유사도 높은 순 정렬 (API에서 정렬됨)
  - 카테고리 필터와 검색 결합 (filters 파라미터)
- **의존성**: B-1, B-2

### B-4. Zustand 상태 통합
- **파일**: `frontend/src/stores/audioStore.ts`
- **작업**:
  - 검색 쿼리, 필터 상태, 플레이어 상태 통합
  - URL 쿼리 파라미터와 동기화 (`?q=rain&major=Ambience`)
- **의존성**: B-1 ~ B-3

**Phase B 병렬 구조:**
```
B-1 (API 훅) ─┬─ B-2 (검색바)
              └─ B-3 (결과 표시) ─── B-4 (상태 통합)
```

---

## Phase C: 플레이어 고도화

### C-1. 하단 고정 플레이어 바
- **파일**: `frontend/src/components/audio/AudioPlayer.tsx` 리팩토링
- **작업**:
  - 페이지 하단 고정 (sticky bottom)
  - 현재 트랙 정보 + 프로그레스 바 + 볼륨 + 시간 표시
  - 이전/다음 트랙
  - 페이지 이동해도 재생 유지 (layout 레벨 마운트)

### C-2. 파형 시각화 (선택)
- **파일**: `frontend/src/components/audio/WaveformDisplay.tsx`
- **작업**:
  - wavesurfer.js 또는 canvas 기반 파형
  - 클릭으로 탐색 (seek)
- **라이브러리**: `wavesurfer.js` 또는 직접 canvas 구현

---

## Phase D: 부가 기능

### D-1. 검색 자동완성
- **백엔드**: `GET /api/audio/search/suggest?q=rai` → tags/mood에서 매칭
- **프론트**: 드롭다운 서제스천

### D-2. 라이브러리 통계
- **백엔드**: `GET /api/audio/stats` → 총 개수, 카테고리별 분포, 포맷별 분포
- **프론트**: 메인 페이지 상단 요약 카드

### D-3. 즐겨찾기 (선택)
- **스키마 추가**: `AudioFavorite` (userId + audioAssetId)
- **API**: `POST/DELETE /api/audio/:id/favorite`
- **프론트**: 하트 아이콘 토글 + 즐겨찾기 필터

---

## 충돌 위험 파일

| 파일 | 작업 | 주의 |
|------|------|------|
| `frontend/src/components/sidebar/*` | A-2 | 기존 사이드바 수정, 다른 Phase와 충돌 가능 |
| `frontend/src/app/layout.tsx` | C-1 | 플레이어 바 추가 시 레이아웃 변경 |
| `backend/src/routes/audio/index.ts` | A-1 | 라우트 추가, 기존 4개와 공존 |
| `backend/src/services/audio.service.ts` | A-1 | 서비스 함수 추가 |

## 작업 순서 권장

```
1. Phase A (기본 탐색)     — 파이프라인 완료 후 즉시 착수
2. Phase B (자연어 검색)   — Phase A 완료 후
3. Phase C (플레이어)      — Phase B와 병렬 가능
4. Phase D (부가 기능)     — 여유 시 선택 구현
```

## 예상 소요

- Phase A: 작업 6개
- Phase B: 작업 4개
- Phase C: 작업 2개
- Phase D: 작업 3개 (선택)
