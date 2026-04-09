"""Gemini 2.5 Flash를 사용한 오디오 파일 분류"""

import asyncio
import io
import json
import os
import wave
from pathlib import Path

from tqdm import tqdm

from services.gemini import classify_async, get_mime_type

# Gemini 동시 요청 제한
SEMAPHORE = asyncio.Semaphore(10)

# 분류용 최대 오디오 길이 (초)
MAX_CLASSIFY_SECONDS = 15


def _trim_wav(audio_path: str, max_seconds: int = MAX_CLASSIFY_SECONDS) -> tuple[bytes, str]:
    """WAV 파일의 앞 N초만 추출. 비-WAV는 원본 반환."""
    ext = Path(audio_path).suffix.lower()
    if ext != ".wav":
        with open(audio_path, "rb") as f:
            return f.read(), get_mime_type(audio_path)

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
            return f.read(), get_mime_type(audio_path)


async def classify_single(audio_path: str, file_name: str) -> dict | None:
    """단일 오디오 파일을 Gemini로 분류"""
    async with SEMAPHORE:
        audio_bytes, mime_type = _trim_wav(audio_path)
        result = await classify_async(audio_bytes, mime_type, file_name)
        del audio_bytes
        return result


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

    results = []

    # 배치 처리 (10개씩)
    batch_size = 10
    with tqdm(total=len(remaining), desc="분류 중") as pbar:
        for i in range(0, len(remaining), batch_size):
            batch = remaining[i : i + batch_size]
            tasks = [
                classify_single(fp, os.path.basename(fp)) for fp in batch
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
