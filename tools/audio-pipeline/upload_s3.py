"""분류된 오디오 파일을 S3에 업로드"""

import json
import os
from pathlib import Path

from tqdm import tqdm

from services import s3 as s3_svc


def upload_all(classify_manifest: str, upload_manifest: str, dry_run: bool = False) -> list[dict]:
    """분류 manifest 기반으로 S3 업로드"""
    bucket = s3_svc.get_bucket()

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
            s3_key = s3_svc.build_s3_key(e["major"], e["mid"], e.get("sub"), e["file_name"])
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

    s3_client = s3_svc.create_client()

    results = []
    with tqdm(total=len(remaining), desc="업로드 중") as pbar:
        for entry in remaining:
            file_path = entry["file_path"]
            s3_key = s3_svc.build_s3_key(entry["major"], entry["mid"], entry.get("sub"), entry["file_name"])
            file_size = os.path.getsize(file_path)

            try:
                s3_svc.upload_file(s3_client, bucket, s3_key, file_path)

                result = {
                    "file_path": file_path,
                    "file_name": entry["file_name"],
                    "s3_key": s3_key,
                    "s3_bucket": bucket,
                    "file_size": file_size,
                    "content_type": s3_svc.get_content_type(file_path),
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
