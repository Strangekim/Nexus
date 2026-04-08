"""Gemini 2.5 Flash를 사용한 오디오 파일 분류"""

import asyncio
import io
import json
import mimetypes
import os
import wave
from pathlib import Path

from google import genai
from google.genai import types
from tqdm import tqdm

from taxonomy import TAXONOMY, validate_classification

# Gemini 동시 요청 제한
SEMAPHORE = asyncio.Semaphore(10)

# 분류용 최대 오디오 길이 (초)
MAX_CLASSIFY_SECONDS = 15

SYSTEM_PROMPT = """너는 오디오 파일 분류 전문가야. 주어진 오디오를 듣고 아래 taxonomy에 따라 정확히 분류해.

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

반드시 JSON 형식으로만 응답해."""

TAXONOMY_TEXT = json.dumps(
    {k: {"mid": {mk: mv for mk, mv in v["mid"].items()}} for k, v in TAXONOMY.items()},
    indent=2,
)


def _get_mime_type(path: str) -> str:
    """파일 확장자로 MIME 타입 결정"""
    mime, _ = mimetypes.guess_type(path)
    if mime and mime.startswith("audio/"):
        return mime
    ext = Path(path).suffix.lower()
    mime_map = {".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".flac": "audio/flac"}
    return mime_map.get(ext, "audio/mpeg")


def _trim_wav(audio_path: str, max_seconds: int = MAX_CLASSIFY_SECONDS) -> tuple[bytes, str]:
    """WAV 파일의 앞 N초만 추출. 비-WAV는 원본 반환."""
    ext = Path(audio_path).suffix.lower()
    if ext != ".wav":
        with open(audio_path, "rb") as f:
            return f.read(), _get_mime_type(audio_path)

    try:
        with wave.open(audio_path, "rb") as w:
            params = w.getparams()
            max_frames = params.framerate * max_seconds
            frames_to_read = min(params.nframes, max_frames)
            raw = w.readframes(frames_to_read)

        buf = io.BytesIO()
        with wave.open(buf, "wb") as out:
            out.setparams(params._replace(nframes=frames_to_read))
            out.writeframes(raw)
        return buf.getvalue(), "audio/wav"
    except Exception:
        with open(audio_path, "rb") as f:
            return f.read(), _get_mime_type(audio_path)


async def classify_single(client: genai.Client, audio_path: str, file_name: str) -> dict | None:
    """단일 오디오 파일을 Gemini로 분류"""
    async with SEMAPHORE:
        try:
            audio_bytes, mime_type = _trim_wav(audio_path)

            # API 호출 후 바로 메모리 해제
            response = await client.aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    types.Content(
                        parts=[
                            types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
                            types.Part.from_text(
                                text=f"파일명: {file_name}\n이 오디오를 분류해줘."
                            ),
                        ]
                    )
                ],
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT.format(taxonomy=TAXONOMY_TEXT),
                    response_mime_type="application/json",
                    response_schema={
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
                    },
                    temperature=0.1,
                ),
            )

            del audio_bytes  # 메모리 즉시 해제
            result = json.loads(response.text)

            # taxonomy 검증
            major, mid, sub = validate_classification(
                result.get("major", ""),
                result.get("mid", ""),
                result.get("sub"),
            )
            result["major"] = major
            result["mid"] = mid
            result["sub"] = sub

            return result

        except Exception as e:
            print(f"  [오류] {file_name}: {e}")
            return None


def load_processed(manifest_path: str) -> set[str]:
    """이미 처리된 파일 목록 로드"""
    processed = set()
    if os.path.exists(manifest_path):
        with open(manifest_path, "r") as f:
            for line in f:
                try:
                    entry = json.loads(line)
                    processed.add(entry["file_path"])
                except (json.JSONDecodeError, KeyError):
                    continue
    return processed


async def classify_all(source_dir: str, manifest_path: str, dry_run: bool = False) -> list[dict]:
    """소스 디렉토리의 모든 오디오 파일 분류"""
    # 오디오 파일 스캔
    audio_extensions = {".wav", ".mp3", ".ogg", ".flac"}
    files = []
    for root, _, filenames in os.walk(source_dir):
        for fname in filenames:
            if Path(fname).suffix.lower() in audio_extensions:
                files.append(os.path.join(root, fname))

    files.sort()
    print(f"총 {len(files)}개 오디오 파일 발견")

    if dry_run:
        for f in files[:10]:
            print(f"  {f}")
        if len(files) > 10:
            print(f"  ... 외 {len(files) - 10}개")
        return []

    # 이미 처리된 파일 스킵
    processed = load_processed(manifest_path)
    remaining = [f for f in files if f not in processed]
    print(f"이미 처리: {len(processed)}개, 남은 파일: {len(remaining)}개")

    if not remaining:
        print("모든 파일이 이미 처리되었습니다.")
        return []

    client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])
    results = []

    # 배치 처리 (10개씩)
    batch_size = 10
    with tqdm(total=len(remaining), desc="분류 중") as pbar:
        for i in range(0, len(remaining), batch_size):
            batch = remaining[i : i + batch_size]
            tasks = [
                classify_single(client, fp, os.path.basename(fp)) for fp in batch
            ]
            batch_results = await asyncio.gather(*tasks)

            with open(manifest_path, "a") as f:
                for fp, result in zip(batch, batch_results):
                    if result:
                        entry = {
                            "file_path": fp,
                            "file_name": os.path.basename(fp),
                            "relative_path": os.path.relpath(fp, source_dir),
                            **result,
                        }
                        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
                        results.append(entry)
                    pbar.update(1)

    print(f"분류 완료: {len(results)}개 성공")
    return results
