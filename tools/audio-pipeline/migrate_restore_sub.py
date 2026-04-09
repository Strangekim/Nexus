"""classify.jsonl 원본 데이터에서 sub 복원 후 정규화 적용"""

import json
import os

import psycopg
from dotenv import load_dotenv

from taxonomy import validate_classification

load_dotenv()


def main():
    conn = psycopg.connect(os.environ["DATABASE_URL"])

    # classify.jsonl에서 원본 분류 로드 (file_name → sub)
    original_subs: dict[str, dict] = {}
    classify_path = "manifest/classify.jsonl"
    if os.path.exists(classify_path):
        with open(classify_path) as f:
            for line in f:
                try:
                    entry = json.loads(line)
                    original_subs[entry["file_name"]] = {
                        "major": entry.get("major", ""),
                        "mid": entry.get("mid", ""),
                        "sub": entry.get("sub"),
                    }
                except (json.JSONDecodeError, KeyError):
                    continue
    print(f"원본 분류 데이터: {len(original_subs)}개")

    # DB에서 sub=NULL인 에셋 조회
    with conn.cursor() as cur:
        cur.execute("SELECT id, file_name, major, mid FROM audio_assets WHERE sub IS NULL")
        null_rows = cur.fetchall()
    print(f"sub=NULL 에셋: {len(null_rows)}개")

    # 복원
    restored = 0
    still_null = 0
    for row_id, file_name, db_major, db_mid in null_rows:
        orig = original_subs.get(file_name)
        if not orig or not orig.get("sub"):
            still_null += 1
            continue

        # 원본 major/mid/sub를 정규화
        norm_major, norm_mid, norm_sub = validate_classification(
            orig["major"], orig["mid"], orig["sub"]
        )

        if norm_sub:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE audio_assets SET major = %s, mid = %s, sub = %s WHERE id = %s",
                    (norm_major, norm_mid, norm_sub, row_id),
                )
            restored += 1
        else:
            still_null += 1

    conn.commit()

    # 검증
    with conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM audio_assets WHERE sub IS NULL")
        remaining_null = cur.fetchone()[0]

    conn.close()
    print(f"복원: {restored}개, 여전히 NULL: {still_null}개")
    print(f"DB sub=NULL 잔여: {remaining_null}개")
    print("완료!")


if __name__ == "__main__":
    main()
