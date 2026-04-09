"""
Freesound 수집 스크립트
DB에서 적은 카테고리 파악 → Freesound 고다운로드순 검색 → Gemini 분류 → 임베딩 → S3 → DB
"""

import json
import time
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from services import freesound, gemini, database, s3 as s3_svc

# ── 카테고리별 검색 키워드 매핑 ──
CATEGORY_QUERIES = {
    "Music": [
        "cinematic score", "lofi chill beat", "electronic music", "orchestral",
        "jazz", "hip hop beat", "acoustic guitar", "ambient pad",
        "percussion loop", "jingle sound",
    ],
    "Dialogue_VO": [
        "narration voiceover", "crowd talking", "public announcement",
        "dialogue conversation", "robot voice synthetic",
    ],
    "Ambience": [
        "market bazaar", "stadium crowd", "mall ambience", "hospital ambience",
        "school classroom", "playground children", "hail storm",
        "park birds", "subway train station",
    ],
    "Foley": [
        "footsteps tile", "footsteps mud", "footsteps sand", "dress rustle",
        "jumping landing", "cabinet door", "chalk blackboard",
        "pencil writing", "swallow gulp drink", "grab release object",
    ],
    "Hard_SFX": [
        "cat meow", "insect buzz cricket", "shield block", "magic spell",
        "torch fire", "wave ocean crash", "kick impact",
        "whistle referee", "ball bounce sport",
    ],
    "Cinematic": [
        "magic sparkle fairy", "jump scare horror", "hologram sci fi",
        "tension build suspense", "fade transition", "enchant shimmer",
    ],
}

# 카테고리당 키워드 하나에서 최대 수집 수
PER_QUERY = 10

# 매니페스트
MANIFEST = Path("manifest/freesound.jsonl")
MANIFEST.parent.mkdir(exist_ok=True)


def load_collected_ids() -> set[int]:
    """이미 수집한 freesound ID"""
    ids = set()
    if MANIFEST.exists():
        with open(MANIFEST) as f:
            for line in f:
                try:
                    ids.add(json.loads(line)["freesound_id"])
                except (json.JSONDecodeError, KeyError):
                    pass
    return ids


def save_manifest(entry: dict) -> None:
    """매니페스트에 한 줄 추가"""
    with open(MANIFEST, "a") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def process_sound(sound: dict, s3_client, s3_bucket: str, conn) -> bool:
    """
    단일 사운드 처리: 다운로드 → 분류 → 임베딩 → S3 → DB
    반환: 성공 여부
    """
    # 1) 다운로드
    dl = freesound.download_preview(sound)
    if not dl:
        return False
    audio_bytes, fmt, filename = dl
    mime_type = gemini.get_mime_type(filename)

    # 2) Gemini 분류
    classification = gemini.classify(audio_bytes, mime_type, filename)
    if not classification:
        return False

    # 3) Gemini 임베딩
    embedding = gemini.embed(audio_bytes, mime_type)
    if not embedding:
        return False

    # 4) S3 업로드
    s3_key = s3_svc.build_s3_key(
        classification["major"], classification["mid"],
        classification.get("sub"), filename
    )
    s3_svc.upload_bytes(s3_client, s3_bucket, s3_key, audio_bytes, mime_type)

    # 5) DB 삽입
    ok = database.insert_audio(
        conn,
        file_name=filename,
        s3_key=s3_key,
        classification=classification,
        duration=sound.get("duration"),
        fmt=fmt,
        file_size=len(audio_bytes),
        embedding=embedding,
    )

    del audio_bytes
    return ok


def main():
    conn = database.connect()
    s3_client = s3_svc.create_client()
    s3_bucket = s3_svc.get_bucket()
    collected_ids = load_collected_ids()

    # DB 카테고리 현황
    cat_counts = database.get_category_counts(conn)
    print("현재 DB 카테고리 현황:", flush=True)
    for major, cnt in cat_counts.items():
        print(f"  {major}: {cnt}개", flush=True)
    print(flush=True)

    # 적은 카테고리 우선 정렬
    priority = sorted(CATEGORY_QUERIES.keys(), key=lambda m: cat_counts.get(m, 0))

    total_ok = 0
    total_err = 0

    for major in priority:
        queries = CATEGORY_QUERIES[major]
        print(f"\n{'='*60}", flush=True)
        print(f"[{major}] (현재 {cat_counts.get(major, 0)}개) — 검색 {len(queries)}개 키워드", flush=True)
        print(f"{'='*60}", flush=True)

        for query in queries:
            print(f"\n  검색: '{query}' (downloads_desc)", flush=True)
            try:
                results = freesound.search(query, sort="downloads_desc", page_size=PER_QUERY + 5)
            except Exception as e:
                print(f"  검색 실패: {e}", flush=True)
                total_err += 1
                time.sleep(2)
                continue

            count = 0
            for sound in results:
                if count >= PER_QUERY:
                    break
                if sound["id"] in collected_ids:
                    continue
                if sound.get("num_ratings", 0) < 1:
                    continue

                try:
                    ok = process_sound(sound, s3_client, s3_bucket, conn)
                    if not ok:
                        total_err += 1
                        continue

                    # 매니페스트 기록
                    collected_ids.add(sound["id"])
                    save_manifest({
                        "freesound_id": sound["id"],
                        "name": sound["name"],
                        "rating": sound.get("avg_rating"),
                        "downloads": sound.get("num_downloads"),
                    })

                    count += 1
                    total_ok += 1
                    print(f"    ✓ {sound['name'][:50]} "
                          f"(dl={sound.get('num_downloads', 0)}, {sound.get('duration', 0):.1f}s)",
                          flush=True)

                    time.sleep(1.5)

                except Exception as e:
                    print(f"    ✗ {sound.get('name', '?')[:50]}: {e}", flush=True)
                    total_err += 1

            if count == 0:
                print("    (조건에 맞는 결과 없음)", flush=True)

    conn.close()
    print(f"\n{'='*60}", flush=True)
    print(f"완료: {total_ok}개 수집, {total_err}개 에러", flush=True)


if __name__ == "__main__":
    main()
