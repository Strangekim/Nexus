"""PostgreSQL + pgvector에 오디오 메타데이터 및 임베딩 삽입 (배치)"""

import json
from pathlib import Path

from tqdm import tqdm

from services import database


def insert_all(
    classify_manifest: str,
    upload_manifest: str,
    embed_manifest: str,
    dry_run: bool = False,
) -> int:
    """분류 + 업로드 + 임베딩 결과를 DB에 배치 삽입"""
    # 데이터 로드
    classify_data = {}
    with open(classify_manifest, "r") as f:
        for line in f:
            entry = json.loads(line)
            classify_data[entry["file_path"]] = entry

    upload_data = {}
    with open(upload_manifest, "r") as f:
        for line in f:
            entry = json.loads(line)
            upload_data[entry["file_path"]] = entry

    embed_data = {}
    with open(embed_manifest, "r") as f:
        for line in f:
            entry = json.loads(line)
            embed_data[entry["file_path"]] = entry

    # 세 manifest 모두에 존재하는 파일만 처리
    common_files = set(classify_data.keys()) & set(upload_data.keys()) & set(embed_data.keys())
    print(f"DB 삽입 대상: {len(common_files)}개 파일")
    print(f"  분류: {len(classify_data)}, 업로드: {len(upload_data)}, 임베딩: {len(embed_data)}")

    if dry_run:
        for fp in list(common_files)[:5]:
            c = classify_data[fp]
            u = upload_data[fp]
            print(f"  {c['file_name']} → {u['s3_key']} ({c['major']}/{c['mid']})")
        return 0

    conn = database.connect()
    inserted = 0

    with tqdm(total=len(common_files), desc="DB 삽입 중") as pbar:
        for fp in common_files:
            c = classify_data[fp]
            u = upload_data[fp]
            e = embed_data[fp]

            ok = database.insert_audio(
                conn,
                file_name=c["file_name"],
                s3_key=u["s3_key"],
                classification=c,
                duration=c.get("estimatedDurationSec"),
                fmt=Path(c["file_name"]).suffix.lower().lstrip("."),
                file_size=u.get("file_size", 0),
                embedding=e["embedding"],
            )
            if ok:
                inserted += 1
            pbar.update(1)

    conn.close()
    print(f"DB 삽입 완료: {inserted}개")
    return inserted
