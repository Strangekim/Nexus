"""분류된 오디오 파일을 S3에 업로드"""

import json
import os
import re
from pathlib import Path

import boto3
from tqdm import tqdm


def _to_kebab(name: str) -> str:
    """문자열을 kebab-case로 변환"""
    name = name.replace("_", "-").replace(" ", "-")
    name = re.sub(r"[^a-zA-Z0-9\-]", "", name)
    name = re.sub(r"-+", "-", name).strip("-").lower()
    return name


def _get_content_type(file_path: str) -> str:
    """파일 확장자로 Content-Type 결정"""
    ext = Path(file_path).suffix.lower()
    content_types = {
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".ogg": "audio/ogg",
        ".flac": "audio/flac",
    }
    return content_types.get(ext, "application/octet-stream")


def _build_s3_key(entry: dict) -> str:
    """분류 결과로 S3 키 생성"""
    major = _to_kebab(entry["major"])
    mid = _to_kebab(entry["mid"])
    filename = Path(entry["file_name"]).name

    parts = ["audio", major, mid]
    if entry.get("sub"):
        parts.append(_to_kebab(entry["sub"]))
    parts.append(filename)

    return "/".join(parts)


def upload_all(classify_manifest: str, upload_manifest: str, dry_run: bool = False) -> list[dict]:
    """분류 manifest 기반으로 S3 업로드"""
    bucket = os.environ["AWS_S3_BUCKET"]
    region = os.environ.get("AWS_REGION", "ap-northeast-2")

    # 분류 결과 로드
    entries = []
    with open(classify_manifest, "r") as f:
        for line in f:
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    print(f"업로드 대상: {len(entries)}개 파일")

    if dry_run:
        for e in entries[:10]:
            s3_key = _build_s3_key(e)
            print(f"  {e['file_name']} → s3://{bucket}/{s3_key}")
        if len(entries) > 10:
            print(f"  ... 외 {len(entries) - 10}개")
        return []

    # 이미 업로드된 파일 스킵
    uploaded = set()
    if os.path.exists(upload_manifest):
        with open(upload_manifest, "r") as f:
            for line in f:
                try:
                    entry = json.loads(line)
                    uploaded.add(entry["file_path"])
                except (json.JSONDecodeError, KeyError):
                    continue

    remaining = [e for e in entries if e["file_path"] not in uploaded]
    print(f"이미 업로드: {len(uploaded)}개, 남은 파일: {len(remaining)}개")

    if not remaining:
        print("모든 파일이 이미 업로드되었습니다.")
        return []

    s3 = boto3.client(
        "s3",
        region_name=region,
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )

    results = []
    with tqdm(total=len(remaining), desc="업로드 중") as pbar:
        for entry in remaining:
            file_path = entry["file_path"]
            s3_key = _build_s3_key(entry)
            content_type = _get_content_type(file_path)
            file_size = os.path.getsize(file_path)

            try:
                extra_args = {"ContentType": content_type}

                # 8MB 초과 시 멀티파트 업로드
                config = boto3.s3.transfer.TransferConfig(
                    multipart_threshold=8 * 1024 * 1024,
                    multipart_chunksize=8 * 1024 * 1024,
                )

                s3.upload_file(
                    file_path,
                    bucket,
                    s3_key,
                    ExtraArgs=extra_args,
                    Config=config,
                )

                result = {
                    "file_path": file_path,
                    "file_name": entry["file_name"],
                    "s3_key": s3_key,
                    "s3_bucket": bucket,
                    "file_size": file_size,
                    "content_type": content_type,
                    "major": entry["major"],
                    "mid": entry["mid"],
                    "sub": entry.get("sub"),
                }

                with open(upload_manifest, "a") as f:
                    f.write(json.dumps(result, ensure_ascii=False) + "\n")

                results.append(result)

            except Exception as e:
                print(f"  [오류] {entry['file_name']}: {e}")

            pbar.update(1)

    print(f"업로드 완료: {len(results)}개 성공")
    return results
