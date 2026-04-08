"""S3에서 오디오를 읽어 임베딩 생성 + DB 즉시 삽입 (EC2용)"""

import asyncio
import json
import os
from pathlib import Path

import boto3
import psycopg
from google import genai
from google.genai import types
from tqdm import tqdm
from dotenv import load_dotenv

load_dotenv()

# 순차 처리 (EC2 3.7GB 메모리 보호)
SEMAPHORE = asyncio.Semaphore(1)

# 50MB 초과 파일 스킵
MAX_FILE_SIZE = 50 * 1024 * 1024


def _get_mime_type(s3_key: str) -> str:
    ext = Path(s3_key).suffix.lower()
    return {".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".flac": "audio/flac"}.get(ext, "audio/mpeg")


def _get_format(file_name: str) -> str:
    return Path(file_name).suffix.lower().lstrip(".")


def _create_s3_client():
    return boto3.client(
        "s3",
        region_name=os.environ.get("AWS_REGION", "ap-northeast-2"),
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


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


async def embed_single(client: genai.Client, s3_client, bucket: str, s3_key: str) -> list[float] | None:
    """S3에서 오디오를 읽어 임베딩"""
    async with SEMAPHORE:
        try:
            head = s3_client.head_object(Bucket=bucket, Key=s3_key)
            if head["ContentLength"] > MAX_FILE_SIZE:
                print(f"  [스킵] {Path(s3_key).name}: {head['ContentLength'] / 1024 / 1024:.0f}MB 초과")
                return None

            response = s3_client.get_object(Bucket=bucket, Key=s3_key)
            audio_bytes = response["Body"].read()
            mime_type = _get_mime_type(s3_key)

            result = await client.aio.models.embed_content(
                model="gemini-embedding-2-preview",
                contents=[types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)],
                config=types.EmbedContentConfig(output_dimensionality=3072),
            )

            del audio_bytes
            return result.embeddings[0].values

        except Exception as e:
            print(f"  [오류] {Path(s3_key).name}: {e}")
            return None


def insert_to_db(conn, classify_entry: dict, upload_entry: dict, embedding: list[float]):
    """임베딩 완료 즉시 DB 삽입"""
    embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"
    params = {
        "file_name": classify_entry["file_name"],
        "s3_key": upload_entry["s3_key"],
        "major": classify_entry["major"],
        "mid": classify_entry["mid"],
        "sub": classify_entry.get("sub"),
        "mood": classify_entry.get("mood", []),
        "tags": classify_entry.get("tags", []),
        "description": classify_entry.get("description", ""),
        "bpm": classify_entry.get("bpm"),
        "instruments": classify_entry.get("instruments", []),
        "duration": classify_entry.get("estimatedDurationSec"),
        "format": _get_format(classify_entry["file_name"]),
        "file_size": upload_entry.get("file_size", 0),
        "embedding": embedding_str,
    }
    try:
        conn.execute(INSERT_SQL, params)
        conn.commit()
    except Exception as e:
        print(f"  [DB오류] {classify_entry['file_name']}: {e}")
        conn.rollback()


async def main():
    manifest_dir = Path(__file__).parent / "manifest"
    classify_manifest = manifest_dir / "classify.jsonl"
    upload_manifest = manifest_dir / "upload.jsonl"
    embed_manifest = manifest_dir / "embed.jsonl"

    # manifest 로드 (메모리 매핑)
    upload_map = {}
    with open(upload_manifest) as f:
        for line in f:
            entry = json.loads(line)
            upload_map[entry["file_path"]] = entry

    classify_map = {}
    with open(classify_manifest) as f:
        for line in f:
            entry = json.loads(line)
            classify_map[entry["file_path"]] = entry

    entries = []
    for fp, ce in classify_map.items():
        if fp in upload_map:
            ce["_upload"] = upload_map[fp]
            entries.append(ce)

    print(f"임베딩 대상: {len(entries)}개 파일")

    # 이미 처리된 파일 스킵
    processed = set()
    if embed_manifest.exists():
        with open(embed_manifest) as f:
            for line in f:
                try:
                    processed.add(json.loads(line)["file_path"])
                except (json.JSONDecodeError, KeyError):
                    continue

    remaining = [e for e in entries if e["file_path"] not in processed]
    print(f"이미 처리: {len(processed)}개, 남은 파일: {len(remaining)}개")

    if not remaining:
        print("모든 파일이 이미 임베딩되었습니다.")
        return

    # DB 연결 + 백필
    database_url = os.environ["DATABASE_URL"]
    conn = psycopg.connect(database_url)
    print("DB 연결 완료")

    # DB에 없는 기존 임베딩 백필
    db_count = conn.execute("SELECT count(*) FROM audio_assets").fetchone()[0]
    if db_count < len(processed):
        print(f"기존 임베딩 DB 백필 중... (DB: {db_count}, embed: {len(processed)})")
        embed_data = {}
        with open(embed_manifest) as f:
            for line in f:
                try:
                    e = json.loads(line)
                    embed_data[e["file_path"]] = e
                except (json.JSONDecodeError, KeyError):
                    continue

        backfill = 0
        for fp in processed:
            if fp in classify_map and fp in upload_map and fp in embed_data:
                insert_to_db(conn, classify_map[fp], upload_map[fp], embed_data[fp]["embedding"])
                backfill += 1
        print(f"  백필 완료: {backfill}개")
        del embed_data

    # 임베딩 + DB 삽입
    gemini_client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])
    s3_client = _create_s3_client()

    db_inserted = 0
    with tqdm(total=len(remaining), desc="임베딩+DB삽입") as pbar:
        for entry in remaining:
            embedding = await embed_single(
                gemini_client, s3_client,
                entry["_upload"]["s3_bucket"], entry["_upload"]["s3_key"]
            )

            if embedding:
                # jsonl 기록
                with open(embed_manifest, "a") as f:
                    f.write(json.dumps({
                        "file_path": entry["file_path"],
                        "file_name": entry["file_name"],
                        "embedding": embedding,
                    }, ensure_ascii=False) + "\n")

                # DB 즉시 삽입
                insert_to_db(conn, entry, entry["_upload"], embedding)
                db_inserted += 1

            pbar.update(1)

    conn.close()
    print(f"완료: {db_inserted}개 새로 삽입, 총 {len(processed) + db_inserted}개")


if __name__ == "__main__":
    asyncio.run(main())
