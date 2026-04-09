"""PostgreSQL + pgvector DB 서비스"""

import os

import psycopg

from services.gemini import embedding_to_pg

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


def connect():
    """DB 연결 반환"""
    return psycopg.connect(os.environ["DATABASE_URL"])


def insert_audio(conn, *, file_name: str, s3_key: str, classification: dict,
                 duration: float | None, fmt: str, file_size: int,
                 embedding: list[float]) -> bool:
    """
    오디오 에셋 한 건 삽입.
    classification: { major, mid, sub, mood, tags, description, bpm, instruments }
    반환: 성공 여부
    """
    params = {
        "file_name": file_name,
        "s3_key": s3_key,
        "major": classification["major"],
        "mid": classification["mid"],
        "sub": classification.get("sub"),
        "mood": classification.get("mood", []),
        "tags": classification.get("tags", []),
        "description": classification.get("description", ""),
        "bpm": classification.get("bpm"),
        "instruments": classification.get("instruments", []),
        "duration": duration,
        "format": fmt,
        "file_size": file_size,
        "embedding": embedding_to_pg(embedding),
    }
    try:
        with conn.cursor() as cur:
            cur.execute(INSERT_SQL, params)
        conn.commit()
        return True
    except Exception as e:
        print(f"  [DB 오류] {file_name}: {e}", flush=True)
        conn.rollback()
        return False


def get_category_counts(conn) -> dict[str, int]:
    """major별 파일 수 조회 (적은 순)"""
    with conn.cursor() as cur:
        cur.execute("SELECT major, count(*)::int FROM audio_assets GROUP BY major ORDER BY count ASC")
        return {row[0]: row[1] for row in cur.fetchall()}


def get_total_count(conn) -> int:
    """전체 에셋 수"""
    with conn.cursor() as cur:
        cur.execute("SELECT count(*)::int FROM audio_assets")
        return cur.fetchone()[0]


def get_embedded_count(conn) -> int:
    """임베딩 완료 에셋 수"""
    with conn.cursor() as cur:
        cur.execute("SELECT count(*)::int FROM audio_assets WHERE embedding IS NOT NULL")
        return cur.fetchone()[0]
