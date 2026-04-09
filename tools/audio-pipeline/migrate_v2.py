"""taxonomy v1 → v2 마이그레이션: 기존 DB 데이터를 새 분류 체계로 변환"""

import json
import os

import psycopg
from dotenv import load_dotenv

from taxonomy import validate_classification

load_dotenv()


def main():
    conn = psycopg.connect(os.environ["DATABASE_URL"])

    # 전체 에셋 조회
    with conn.cursor() as cur:
        cur.execute("SELECT id, file_name, major, mid, sub FROM audio_assets")
        rows = cur.fetchall()

    print(f"전체 에셋: {len(rows)}개")

    # 원본 classify.jsonl에서 원래 분류 로드
    original: dict[str, dict] = {}
    classify_path = "manifest/classify.jsonl"
    if os.path.exists(classify_path):
        with open(classify_path) as f:
            for line in f:
                try:
                    entry = json.loads(line)
                    original[entry["file_name"]] = entry
                except (json.JSONDecodeError, KeyError):
                    continue
    print(f"원본 분류 데이터: {len(original)}개")

    updates = []
    for row_id, file_name, db_major, db_mid, db_sub in rows:
        # 원본이 있으면 원본 사용, 없으면 DB값 사용
        orig = original.get(file_name)
        if orig:
            src_major = orig.get("major", db_major)
            src_mid = orig.get("mid", db_mid)
            src_sub = orig.get("sub", db_sub)
        else:
            src_major, src_mid, src_sub = db_major, db_mid, db_sub

        norm_major, norm_mid, norm_sub = validate_classification(src_major, src_mid, src_sub)

        if norm_major != db_major or norm_mid != db_mid or norm_sub != db_sub:
            updates.append((row_id, norm_major, norm_mid, norm_sub, db_major, db_mid, db_sub))

    print(f"변경 필요: {len(updates)}개")

    if not updates:
        print("변경 사항 없음")
        conn.close()
        return

    # 변경 통계
    major_changes: dict[str, int] = {}
    mid_changes: dict[str, int] = {}
    for _, nm, nmid, nsub, om, omid, osub in updates:
        if nm != om:
            key = f"{om} → {nm}"
            major_changes[key] = major_changes.get(key, 0) + 1
        if nmid != omid:
            key = f"{om}/{omid} → {nm}/{nmid}"
            mid_changes[key] = mid_changes.get(key, 0) + 1

    if major_changes:
        print("\nmajor 변경:")
        for change, cnt in sorted(major_changes.items(), key=lambda x: -x[1]):
            print(f"  [{cnt:4d}건] {change}")

    if mid_changes:
        print("\nmid 변경 (상위 20개):")
        for change, cnt in sorted(mid_changes.items(), key=lambda x: -x[1])[:20]:
            print(f"  [{cnt:4d}건] {change}")

    # 실행
    print(f"\n{len(updates)}건 업데이트 중...")
    with conn.cursor() as cur:
        for row_id, nm, nmid, nsub, _, _, _ in updates:
            cur.execute(
                "UPDATE audio_assets SET major = %s, mid = %s, sub = %s WHERE id = %s",
                (nm, nmid, nsub, row_id),
            )
    conn.commit()

    # 결과 검증
    with conn.cursor() as cur:
        cur.execute("""
            SELECT major, count(*)::int as cnt
            FROM audio_assets
            GROUP BY major
            ORDER BY cnt DESC
        """)
        print("\n마이그레이션 후 major 분포:")
        for row in cur.fetchall():
            print(f"  {row[0]}: {row[1]}개")

        cur.execute("SELECT count(DISTINCT major||'/'||mid||'/'||coalesce(sub,'')) FROM audio_assets")
        print(f"\n총 카테고리 수: {cur.fetchone()[0]}개")

    conn.close()
    print("완료!")


if __name__ == "__main__":
    main()
