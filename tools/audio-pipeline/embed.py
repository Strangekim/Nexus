"""Gemini Embedding 2로 오디오 멀티모달 임베딩 생성"""

import asyncio
import json
import os
from pathlib import Path

from google import genai
from google.genai import types
from tqdm import tqdm

# 동시 임베딩 요청 제한
SEMAPHORE = asyncio.Semaphore(10)

# Gemini Embedding 2 오디오 최대 80초
MAX_AUDIO_SECONDS = 80


def _get_mime_type(file_path: str) -> str:
    """파일 확장자로 MIME 타입 결정"""
    ext = Path(file_path).suffix.lower()
    mime_map = {".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".flac": "audio/flac"}
    return mime_map.get(ext, "audio/mpeg")


def _trim_audio_if_needed(audio_bytes: bytes, file_path: str) -> bytes:
    """80초 초과 오디오를 트리밍 (pydub 사용)"""
    try:
        from pydub import AudioSegment

        ext = Path(file_path).suffix.lower().lstrip(".")
        fmt = "mp3" if ext == "mp3" else "wav" if ext == "wav" else ext

        audio = AudioSegment.from_file(file_path, format=fmt)
        if len(audio) > MAX_AUDIO_SECONDS * 1000:
            trimmed = audio[: MAX_AUDIO_SECONDS * 1000]
            # 원본 포맷으로 내보내기
            import io
            buf = io.BytesIO()
            trimmed.export(buf, format=fmt)
            return buf.getvalue()
    except ImportError:
        pass  # pydub 없으면 원본 그대로 사용
    except Exception:
        pass

    return audio_bytes


async def embed_single(client: genai.Client, file_path: str) -> list[float] | None:
    """단일 오디오 파일 임베딩"""
    async with SEMAPHORE:
        try:
            with open(file_path, "rb") as f:
                audio_bytes = f.read()

            audio_bytes = _trim_audio_if_needed(audio_bytes, file_path)
            mime_type = _get_mime_type(file_path)

            result = await client.aio.models.embed_content(
                model="gemini-embedding-exp-03-07",
                contents=[types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)],
                config=types.EmbedContentConfig(output_dimensionality=768),
            )

            return result.embeddings[0].values

        except Exception as e:
            print(f"  [오류] {os.path.basename(file_path)}: {e}")
            return None


async def embed_all(classify_manifest: str, embed_manifest: str, dry_run: bool = False) -> list[dict]:
    """분류된 모든 오디오 파일의 임베딩 생성"""
    # 분류 결과 로드
    entries = []
    with open(classify_manifest, "r") as f:
        for line in f:
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    print(f"임베딩 대상: {len(entries)}개 파일")

    if dry_run:
        for e in entries[:5]:
            print(f"  {e['file_name']} ({e['major']}/{e['mid']})")
        return []

    # 이미 처리된 파일 스킵
    processed = set()
    if os.path.exists(embed_manifest):
        with open(embed_manifest, "r") as f:
            for line in f:
                try:
                    entry = json.loads(line)
                    processed.add(entry["file_path"])
                except (json.JSONDecodeError, KeyError):
                    continue

    remaining = [e for e in entries if e["file_path"] not in processed]
    print(f"이미 처리: {len(processed)}개, 남은 파일: {len(remaining)}개")

    if not remaining:
        print("모든 파일이 이미 임베딩되었습니다.")
        return []

    client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])
    results = []

    # 배치 처리 (5개씩 — 임베딩은 더 무거움)
    batch_size = 5
    with tqdm(total=len(remaining), desc="임베딩 중") as pbar:
        for i in range(0, len(remaining), batch_size):
            batch = remaining[i : i + batch_size]
            tasks = [embed_single(client, e["file_path"]) for e in batch]
            batch_results = await asyncio.gather(*tasks)

            with open(embed_manifest, "a") as f:
                for entry, embedding in zip(batch, batch_results):
                    if embedding:
                        result = {
                            "file_path": entry["file_path"],
                            "file_name": entry["file_name"],
                            "embedding": embedding,
                        }
                        f.write(json.dumps(result, ensure_ascii=False) + "\n")
                        results.append(result)
                    pbar.update(1)

    print(f"임베딩 완료: {len(results)}개 성공 (차원: 768)")
    return results
