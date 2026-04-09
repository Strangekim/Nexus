"""DB 기존 데이터의 대소문자/별칭 정규화 마이그레이션"""

import os

import psycopg
from dotenv import load_dotenv

from taxonomy import validate_classification

load_dotenv()


def main():
    conn = psycopg.connect(os.environ["DATABASE_URL"])

    # 전체 에셋의 major, mid, sub 조회
    with conn.cursor() as cur:
        cur.execute("SELECT id, major, mid, sub FROM audio_assets")
        rows = cur.fetchall()

    print(f"전체 에셋: {len(rows)}개")

    updates = []
    for row_id, major, mid, sub in rows:
        norm_major, norm_mid, norm_sub = validate_classification(major, mid, sub)
        if norm_major != major or norm_mid != mid or norm_sub != sub:
            updates.append((row_id, norm_major, norm_mid, norm_sub, major, mid, sub))

    print(f"정규화 필요: {len(updates)}개")

    if not updates:
        print("변경 사항 없음")
        conn.close()
        return

    # 변경 내역 출력
    changes: dict[str, int] = {}
    for _, nm, nmid, nsub, om, omid, osub in updates:
        key = f"{om}/{omid}/{osub} → {nm}/{nmid}/{nsub}"
        changes[key] = changes.get(key, 0) + 1

    print("\n변경 내역:")
    for change, cnt in sorted(changes.items(), key=lambda x: -x[1]):
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
    conn.close()

    # 결과 검증
    conn2 = psycopg.connect(os.environ["DATABASE_URL"])
    with conn2.cursor() as cur:
        cur.execute("""
            SELECT major, mid, sub, count(*)::int
            FROM audio_assets
            GROUP BY major, mid, sub
            ORDER BY major, mid, sub
        """)
        rows = cur.fetchall()

    print(f"\n정규화 후 카테고리 수: {len(rows)}개")
    conn2.close()
    print("완료!")


if __name__ == "__main__":
    main()
