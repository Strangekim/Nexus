<p align="center">
  <img src="frontend/public/logo.png" alt="logo" width="240" />
</p>

<p align="center">
  <strong>Find the exact sound you need — by describing it, showing an image, or dropping a video.</strong>
</p>

<p align="center">
  AI-powered audio asset library with multimodal semantic search across 7,000+ sound files.
</p>

<br/>

---

<br/>

## What is <img src="frontend/public/fabicon.png" alt="logo" width="20" /> ?

<img src="frontend/public/logo.png" alt="logo" width="80" />는 **사운드 디자이너, 영상 편집자, 게임 개발자**를 위한 오디오 에셋 검색 플랫폼입니다.

> *"비 오는 도시 골목길 느낌"*이라고 입력하면, 수천 개의 파일 중에서 가장 어울리는 사운드를 찾아줍니다.
> 레퍼런스 이미지나 영상을 넣으면, 그 분위기에 맞는 사운드를 자동으로 매칭합니다.

기존 사운드 라이브러리의 문제:
- 파일명 기반 검색 → 네이밍 규칙이 다르면 못 찾음
- 폴더 분류 → 사람마다 기준이 달라 일관성 없음
- 수천 개 파일을 하나씩 재생하며 찾는 비효율

<img src="frontend/public/fabicon.png" alt="logo" width="16" />는 **AI가 모든 오디오를 이해하고 분류**한 뒤, **의미 기반으로 검색**합니다.

<br/>

### Library Overview

> 6개 카테고리 탭으로 전체 라이브러리를 탐색합니다.

<p align="center">
  <img src="docs/screenshots/library-overview.png" alt="Library Overview" width="960" />
</p>

### Category Drilldown

> 카테고리를 선택하면 중분류 · 소분류로 드릴다운하여 탐색할 수 있습니다.

<p align="center">
  <img src="docs/screenshots/category-drilldown.png" alt="Category Drilldown" width="960" />
</p>

### Semantic Search

> 자연어로 원하는 사운드를 검색하면, 유사도 점수와 함께 결과가 정렬됩니다.

<p align="center">
  <img src="docs/screenshots/search-results.png" alt="Search Results" width="960" />
</p>

<br/>

---

<br/>

## Multimodal Search

세 가지 방식으로 원하는 사운드를 찾을 수 있습니다.

| 입력 | 예시 | 작동 방식 |
|:---:|------|-----------|
| **텍스트** | *"긴장감 있는 공포 분위기 배경음"* | 자연어를 벡터로 변환, 코사인 유사도 매칭 |
| **이미지** | 숲 사진, 도시 야경 스크린샷 | 이미지를 같은 벡터 공간에 임베딩, 분위기가 유사한 오디오 검색 |
| **영상** | 액션 장면 클립, 자연 다큐 영상 | 영상의 시각적 맥락을 분석, 어울리는 사운드 매칭 |

모든 모달리티가 **동일한 임베딩 공간**에서 비교되므로, 텍스트 없이도 "이 느낌의 소리"를 찾을 수 있습니다.

<br/>

---

<br/>

## Classification Taxonomy

Gemini 2.5 Flash가 모든 오디오 파일을 분석하여 **6개 대분류 → 중분류 → 소분류** 3단계로 자동 분류합니다.

```
├── 🌿 Ambience          환경음, 공간감
│   ├── Nature            숲, 바다, 강, 바람, 새, 비
│   ├── Urban             도시 교통, 거리, 공사, 지하철
│   ├── Interior          사무실, 레스토랑, 병원, 학교
│   ├── Weather           비, 천둥, 바람, 눈
│   └── ...
│
├── 🎬 Cinematic          영화적 효과음
│   ├── Riser / Sweller   텐션 빌드업
│   ├── Hit / Impact      임팩트 사운드
│   ├── Whoosh            전환 효과
│   ├── Drone / Texture   공간 텍스처
│   └── ...
│
├── 🎙️ Dialogue / VO      대화, 나레이션
│   ├── Dialogue          대화
│   ├── Narration VO      나레이션
│   ├── Crowd Dialogue    군중 대화
│   └── ...
│
├── 👟 Foley              동작 음향
│   ├── Footsteps         발소리 (콘크리트, 나무, 자갈, 잔디...)
│   ├── Cloth Rustle      옷감 소리
│   ├── Door / Window     문, 창문
│   ├── Object Handling   물건 다루기
│   └── ...
│
├── 💥 Hard SFX           효과음
│   ├── Explosion         폭발
│   ├── Gunshot / Weapon  총성, 무기
│   ├── Vehicle           탈것 (차, 오토바이, 헬리콥터)
│   ├── Animal            동물 소리
│   └── ...
│
└── 🎵 Music              음악
    ├── BGM               배경 음악 (Cinematic, Lo-fi, Electronic...)
    ├── Stinger           짧은 강조 음악
    ├── Jingle            징글
    └── Drone / Pad       앰비언트 패드
```

<br/>

---

<br/>

## Pipeline

오디오 파일이 검색 가능한 상태가 되기까지의 과정입니다.

```
                    ┌─────────────────────────────────────────────┐
                    │            Audio Asset Pipeline             │
                    └─────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
  │  Upload  │────▶│  Classify    │────▶│  Embed       │────▶│  Search  │
  │          │     │              │     │              │     │          │
  │ 로컬 파일 │     │ Gemini 2.5   │     │ Gemini       │     │ pgvector │
  │ → S3     │     │ Flash        │     │ Embedding 2  │     │ cosine   │
  └──────────┘     └──────────────┘     └──────────────┘     └──────────┘
       │                  │                    │                   │
   s3_key 기록       major/mid/sub         3072-dim vector     유사도 정렬
   파일 크기 기록     mood, tags, bpm       jsonl + DB 즉시삽입   스트리밍 재생
```

### 1. Upload

로컬 오디오 파일을 AWS S3에 업로드합니다.

- 카테고리 폴더 구조 유지 (`Ambience/Nature/Forest/...`)
- 업로드 결과를 `manifest/upload.jsonl`에 기록
- 지원 포맷: WAV, MP3, OGG, FLAC

### 2. Classify

**Gemini 2.5 Flash**가 각 오디오 파일을 듣고 메타데이터를 자동 생성합니다.

```json
{
  "major": "Ambience",
  "mid": "Nature",
  "sub": "Forest",
  "mood": ["peaceful", "natural"],
  "tags": ["birds", "wind", "leaves"],
  "description": "새소리와 바람이 어우러진 숲속 환경음",
  "bpm": null,
  "instruments": []
}
```

분류 정확도를 높이기 위해 **반드시 정의된 taxonomy에서 선택**하도록 프롬프트를 설계했습니다.

### 3. Embed

**Gemini Embedding 2**로 각 오디오의 3072차원 벡터를 생성합니다.

- 오디오 바이너리를 직접 임베딩 (메타데이터가 아닌 소리 자체를 이해)
- 텍스트, 이미지, 영상과 **동일한 벡터 공간**을 공유
- 임베딩 완료 즉시 PostgreSQL에 삽입 → 실시간 검색 가능
- EC2에서 순차 처리 (메모리 3.7GB 환경 대응, 50MB 초과 파일 스킵)

### 4. Search

사용자 입력(텍스트/이미지/영상)을 동일 모델로 임베딩한 뒤, **pgvector 코사인 유사도**로 매칭합니다.

```sql
SELECT *, 1 - (embedding <=> query_vector) AS similarity
FROM audio_assets
ORDER BY embedding <=> query_vector
LIMIT 100;
```

- 카테고리 필터 조합 가능 (`major`, `mid`, `sub`)
- 유사도 점수와 함께 결과 반환
- S3 presigned URL로 즉시 스트리밍 / 다운로드

<br/>

---

<br/>

## Library Stats

| 항목 | 수치 |
|------|------|
| 총 파일 수 | **7,136** |
| 총 용량 | **~232 GB** |
| 대분류 | 6개 |
| 중분류 | 70+개 |
| 소분류 | 200+개 |
| 벡터 차원 | 3,072 |
| 지원 포맷 | WAV, MP3, OGG, FLAC |

<br/>

---

<br/>

## Models Used

| 용도 | 모델 | 역할 |
|------|------|------|
| 오디오 분류 | **Gemini 2.5 Flash** | 오디오를 듣고 카테고리, 무드, 태그, BPM 등 메타데이터 생성 |
| 멀티모달 임베딩 | **Gemini Embedding 2** | 오디오 · 텍스트 · 이미지 · 영상을 동일 벡터 공간에 임베딩 (3072-dim) |
| 벡터 검색 | **pgvector** | PostgreSQL 확장, 코사인 유사도 기반 nearest-neighbor 검색 |

<br/>

---

<br/>

## Getting Started

### 요구사항

- Node.js 20+
- PostgreSQL 15+ (pgvector 확장)
- Google API Key (Gemini)
- AWS S3 버킷 + 자격 증명

### 환경변수

```env
# DB
DATABASE_URL=postgresql://user:pass@localhost:5432/nexus

# AI
GOOGLE_API_KEY=your_gemini_api_key

# Storage
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=your_bucket
AWS_REGION=ap-northeast-2
```

### 파이프라인 실행

```bash
# 1. 오디오 분류
python3 tools/audio-pipeline/classify.py

# 2. S3 업로드
python3 tools/audio-pipeline/upload.py

# 3. 임베딩 + DB 삽입
python3 tools/audio-pipeline/embed_s3.py
```

### 웹 서버 실행

```bash
cd backend && npm install && npm run dev     # API 서버 (:8080)
cd frontend && npm install && npm run dev    # 웹 UI (:3000)
```

<br/>

---

<p align="center">
  <img src="frontend/public/fabicon.png" alt="logo" width="24" />
  <br/>
  <sub>Built with Gemini AI · pgvector · Next.js · Fastify</sub>
</p>
