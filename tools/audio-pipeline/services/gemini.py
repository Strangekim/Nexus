"""Gemini 분류 + 임베딩 서비스"""

import json
import os
from pathlib import Path

from google import genai
from google.genai import types

from taxonomy import TAXONOMY, validate_classification

# ── Gemini 클라이언트 (싱글턴) ──
_client: genai.Client | None = None


def get_client() -> genai.Client:
    """Gemini 클라이언트 반환 (lazy init)"""
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])
    return _client


# ── MIME 타입 ──
MIME_MAP = {
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
}


def get_mime_type(file_path: str) -> str:
    """파일 경로/이름에서 MIME 타입 결정"""
    ext = Path(file_path).suffix.lower()
    return MIME_MAP.get(ext, "audio/mpeg")


# ── 분류 ──
TAXONOMY_TEXT = json.dumps(
    {k: {"mid": {mk: mv for mk, mv in v["mid"].items()}} for k, v in TAXONOMY.items()},
    indent=2,
)

CLASSIFY_SYSTEM_PROMPT = """너는 오디오 파일 분류 전문가야. 주어진 오디오를 듣고 아래 taxonomy에 따라 정확히 분류해.

## Taxonomy
{taxonomy}

## 규칙
1. major, mid는 반드시 taxonomy에 있는 값만 사용
2. sub는 해당 mid의 sub 목록에서 반드시 하나를 선택해야 한다. 가장 가까운 것을 골라라. sub 목록이 빈 배열([])인 mid만 null 허용
3. mood는 해당하는 감정/분위기를 배열로 (예: ["tense", "dark", "mysterious"])
4. tags는 검색에 유용한 키워드를 영어로 3~8개
5. description은 오디오 내용을 영어로 한 문장으로 설명
6. bpm은 음악일 경우만 추정, 나머지는 null
7. instruments는 음악일 경우 사용된 악기 목록, 나머지는 빈 배열
8. 파일명도 참고하되, 실제 오디오 내용을 우선시해

반드시 JSON 형식으로만 응답해.""".format(taxonomy=TAXONOMY_TEXT)

CLASSIFY_SCHEMA = {
    "type": "object",
    "properties": {
        "major": {"type": "string"},
        "mid": {"type": "string"},
        "sub": {"type": "string", "nullable": True},
        "mood": {"type": "array", "items": {"type": "string"}},
        "tags": {"type": "array", "items": {"type": "string"}},
        "description": {"type": "string"},
        "bpm": {"type": "integer", "nullable": True},
        "instruments": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["major", "mid", "mood", "tags", "description"],
}


def classify(audio_bytes: bytes, mime_type: str, file_name: str) -> dict | None:
    """
    오디오 바이트를 Gemini 2.5 Flash로 분류.
    반환: { major, mid, sub, mood, tags, description, bpm, instruments } 또는 None
    """
    client = get_client()
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Content(parts=[
                    types.Part(inline_data=types.Blob(mime_type=mime_type, data=audio_bytes)),
                    types.Part(text=f"파일명: {file_name}\n이 오디오를 분류해줘."),
                ])
            ],
            config=types.GenerateContentConfig(
                system_instruction=CLASSIFY_SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=CLASSIFY_SCHEMA,
                temperature=0.1,
            ),
        )
        result = json.loads(response.text)

        # taxonomy 검증
        major, mid, sub = validate_classification(
            result.get("major", ""), result.get("mid", ""), result.get("sub")
        )
        result["major"] = major
        result["mid"] = mid
        result["sub"] = sub
        return result

    except Exception as e:
        print(f"  [분류 오류] {file_name}: {e}", flush=True)
        return None


async def classify_async(audio_bytes: bytes, mime_type: str, file_name: str) -> dict | None:
    """분류 비동기 버전"""
    client = get_client()
    try:
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Content(parts=[
                    types.Part(inline_data=types.Blob(mime_type=mime_type, data=audio_bytes)),
                    types.Part(text=f"파일명: {file_name}\n이 오디오를 분류해줘."),
                ])
            ],
            config=types.GenerateContentConfig(
                system_instruction=CLASSIFY_SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=CLASSIFY_SCHEMA,
                temperature=0.1,
            ),
        )
        result = json.loads(response.text)
        major, mid, sub = validate_classification(
            result.get("major", ""), result.get("mid", ""), result.get("sub")
        )
        result["major"] = major
        result["mid"] = mid
        result["sub"] = sub
        return result

    except Exception as e:
        print(f"  [분류 오류] {file_name}: {e}", flush=True)
        return None


# ── 임베딩 ──
EMBED_MODEL = "gemini-embedding-2-preview"
EMBED_DIMENSIONS = 3072


def embed(audio_bytes: bytes, mime_type: str) -> list[float] | None:
    """오디오 바이트를 Gemini Embedding 2로 임베딩. 반환: 3072차원 벡터 또는 None"""
    client = get_client()
    try:
        result = client.models.embed_content(
            model=EMBED_MODEL,
            contents=types.Content(
                parts=[types.Part(inline_data=types.Blob(mime_type=mime_type, data=audio_bytes))]
            ),
        )
        return result.embeddings[0].values
    except Exception as e:
        print(f"  [임베딩 오류] {e}", flush=True)
        return None


async def embed_async(audio_bytes: bytes, mime_type: str) -> list[float] | None:
    """임베딩 비동기 버전"""
    client = get_client()
    try:
        result = await client.aio.models.embed_content(
            model=EMBED_MODEL,
            contents=[types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)],
            config=types.EmbedContentConfig(output_dimensionality=EMBED_DIMENSIONS),
        )
        return result.embeddings[0].values
    except Exception as e:
        print(f"  [임베딩 오류] {e}", flush=True)
        return None


def embedding_to_pg(embedding: list[float]) -> str:
    """임베딩 벡터를 pgvector INSERT용 문자열로 변환"""
    return "[" + ",".join(str(v) for v in embedding) + "]"
