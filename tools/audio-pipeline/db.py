"""PostgreSQL + pgvector에 오디오 메타데이터 및 임베딩 삽입"""

import json
import os
from pathlib import Path

import psycopg
from tqdm import tqdm


def _get_format(file_name: str) -> str:
    """파일명에서 포맷 추출"""
    return Path(file_name).suffix.lower().lstrip(".")


def insert_all(
    classify_manifest: str,
    upload_manifest: str,
    embed_manifest: str,
    dry_run: bool = False,
) -> int:
    """분류 + 업로드 + 임베딩 결과를 DB에 삽입"""
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

    database_url = os.environ["DATABASE_URL"]

    INSERT_SQL = """
    INSERT INTO audio_assets (
        id, file_name, s3_key, major, mid, sub,
        mood, tags, description, bpm, instruments,
        duration, format, file_size, embedding
    ) VALUES (
        gen_random_uuid(), %(file_name)s, %(s3_key)s, %(major)s, %(mid)s, %(sub)s,
        %(mood)s, %(tags)s, %(description)s, %(bpm)s, %(instruments)s,
        %(duration)s, %(format)s, %(file_size)s, %(embedding)s::vector
    ) ON CONFLICT (s3_key) DO UPDATE SET
        embedding = EXCLUDED.embedding,
        major = EXCLUDED.major,
        mid = EXCLUDED.mid,
        sub = EXCLUDED.sub,
        mood = EXCLUDED.mood,
        tags = EXCLUDED.tags,
        description = EXCLUDED.description;
    """

    inserted = 0
    batch = []
    batch_size = 50

    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            with tqdm(total=len(common_files), desc="DB 삽입 중") as pbar:
                for fp in common_files:
                    c = classify_data[fp]
                    u = upload_data[fp]
                    e = embed_data[fp]

                    # 임베딩 벡터를 pgvector 형식 문자열로 변환
                    embedding_str = "[" + ",".join(str(v) for v in e["embedding"]) + "]"

                    params = {
                        "file_name": c["file_name"],
                        "s3_key": u["s3_key"],
                        "major": c["major"],
                        "mid": c["mid"],
                        "sub": c.get("sub"),
                        "mood": c.get("mood", []),
                        "tags": c.get("tags", []),
                        "description": c.get("description", ""),
                        "bpm": c.get("bpm"),
                        "instruments": c.get("instruments", []),
                        "duration": c.get("estimatedDurationSec"),
                        "format": _get_format(c["file_name"]),
                        "file_size": u.get("file_size", 0),
                        "embedding": embedding_str,
                    }

                    try:
                        cur.execute(INSERT_SQL, params)
                        inserted += 1
                    except Exception as e_err:
                        print(f"  [오류] {c['file_name']}: {e_err}")
                        conn.rollback()

                    pbar.update(1)

                    # 주기적 커밋
                    if inserted % batch_size == 0:
                        conn.commit()

                conn.commit()

    print(f"DB 삽입 완료: {inserted}개")
    return inserted
