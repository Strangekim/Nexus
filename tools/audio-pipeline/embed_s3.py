"""S3에서 오디오를 읽어 임베딩 생성 + DB 즉시 삽입 (EC2용)"""

import asyncio
import json
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from services import gemini, database, s3 as s3_svc
from tqdm import tqdm

# 순차 처리 (EC2 3.7GB 메모리 보호)
SEMAPHORE = asyncio.Semaphore(1)

# 50MB 초과 파일 스킵
MAX_FILE_SIZE = 50 * 1024 * 1024


async def embed_single(s3_client, bucket: str, s3_key: str) -> list[float] | None:
    """S3에서 오디오를 읽어 임베딩"""
    async with SEMAPHORE:
        try:
            file_size = s3_svc.get_file_size(s3_client, bucket, s3_key)
            if file_size > MAX_FILE_SIZE:
                print(f"  [스킵] {Path(s3_key).name}: {file_size / 1024 / 1024:.0f}MB 초과")
                return None

            audio_bytes = s3_svc.download_bytes(s3_client, bucket, s3_key)
            mime_type = gemini.get_mime_type(s3_key)

            embedding = await gemini.embed_async(audio_bytes, mime_type)
            del audio_bytes
            return embedding

        except Exception as e:
            print(f"  [오류] {Path(s3_key).name}: {e}")
            return None


async def main():
    manifest_dir = Path(__file__).parent / "manifest"
    classify_manifest = manifest_dir / "classify.jsonl"
    upload_manifest = manifest_dir / "upload.jsonl"
    embed_manifest = manifest_dir / "embed.jsonl"

    # manifest 로드
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

    # DB 연결
    conn = database.connect()
    print("DB 연결 완료")

    # DB에 없는 기존 임베딩 백필
    db_count = database.get_embedded_count(conn)
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
                database.insert_audio(
                    conn,
                    file_name=classify_map[fp]["file_name"],
                    s3_key=upload_map[fp]["s3_key"],
                    classification=classify_map[fp],
                    duration=classify_map[fp].get("estimatedDurationSec"),
                    fmt=Path(classify_map[fp]["file_name"]).suffix.lower().lstrip("."),
                    file_size=upload_map[fp].get("file_size", 0),
                    embedding=embed_data[fp]["embedding"],
                )
                backfill += 1
        print(f"  백필 완료: {backfill}개")
        del embed_data

    # 임베딩 + DB 삽입
    s3_client = s3_svc.create_client()
    db_inserted = 0

    with tqdm(total=len(remaining), desc="임베딩+DB삽입") as pbar:
        for entry in remaining:
            upload_entry = entry["_upload"]
            embedding = await embed_single(s3_client, upload_entry["s3_bucket"], upload_entry["s3_key"])

            if embedding:
                # jsonl 기록
                with open(embed_manifest, "a") as f:
                    f.write(json.dumps({
                        "file_path": entry["file_path"],
                        "file_name": entry["file_name"],
                        "embedding": embedding,
                    }, ensure_ascii=False) + "\n")

                # DB 즉시 삽입
                database.insert_audio(
                    conn,
                    file_name=entry["file_name"],
                    s3_key=upload_entry["s3_key"],
                    classification=entry,
                    duration=entry.get("estimatedDurationSec"),
                    fmt=Path(entry["file_name"]).suffix.lower().lstrip("."),
                    file_size=upload_entry.get("file_size", 0),
                    embedding=embedding,
                )
                db_inserted += 1

            pbar.update(1)

    conn.close()
    print(f"완료: {db_inserted}개 새로 삽입, 총 {len(processed) + db_inserted}개")


if __name__ == "__main__":
    asyncio.run(main())
