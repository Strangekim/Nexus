"""카테고리 정규화 + 골드셋 플랫폼 마이그레이션

수행 작업:
1. category_major / category_mid / category_sub 테이블 생성
2. shared/audio-taxonomy.json에서 시드 데이터 INSERT
3. audio_assets에 major_id/mid_id/sub_id 컬럼 추가 (nullable)
4. 기존 VARCHAR 데이터를 FK로 매핑
5. 매핑 검증 후 NOT NULL + FK 제약 추가
6. 기존 major/mid/sub 컬럼 DROP
7. 골드셋 플랫폼 테이블 생성 (assignment_round/item/response, gold_set)
8. _prisma_migrations에 마이그레이션 기록 추가

단일 트랜잭션 — 실패 시 전체 롤백.
"""

import json
import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv

load_dotenv()

TAXONOMY_PATH = Path(__file__).resolve().parents[2] / "shared" / "audio-taxonomy.json"
MIGRATION_NAME = "20260410120000_normalize_categories_goldset"


def main():
    taxonomy = json.loads(TAXONOMY_PATH.read_text(encoding="utf-8"))

    conn = psycopg.connect(os.environ["DATABASE_URL"])
    conn.autocommit = False

    try:
        with conn.cursor() as cur:
            print("=== 1. 카테고리 마스터 테이블 생성 ===")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS category_major (
                    id SERIAL PRIMARY KEY,
                    key VARCHAR(50) NOT NULL UNIQUE,
                    label VARCHAR(100) NOT NULL
                );
                CREATE TABLE IF NOT EXISTS category_mid (
                    id SERIAL PRIMARY KEY,
                    major_id INT NOT NULL REFERENCES category_major(id) ON DELETE CASCADE,
                    key VARCHAR(50) NOT NULL,
                    UNIQUE(major_id, key)
                );
                CREATE INDEX IF NOT EXISTS category_mid_major_id_idx ON category_mid(major_id);
                CREATE TABLE IF NOT EXISTS category_sub (
                    id SERIAL PRIMARY KEY,
                    mid_id INT NOT NULL REFERENCES category_mid(id) ON DELETE CASCADE,
                    key VARCHAR(50) NOT NULL,
                    UNIQUE(mid_id, key)
                );
                CREATE INDEX IF NOT EXISTS category_sub_mid_id_idx ON category_sub(mid_id);
            """)

            print("=== 2. 카테고리 시드 데이터 INSERT ===")
            major_ids = {}
            for cat in taxonomy["categories"]:
                cur.execute(
                    "INSERT INTO category_major (key, label) VALUES (%s, %s) RETURNING id",
                    (cat["key"], cat["label"]),
                )
                major_ids[cat["key"]] = cur.fetchone()[0]

            mid_ids = {}  # (major_key, mid_key) -> id
            for cat in taxonomy["categories"]:
                for mid_key in cat["mids"].keys():
                    cur.execute(
                        "INSERT INTO category_mid (major_id, key) VALUES (%s, %s) RETURNING id",
                        (major_ids[cat["key"]], mid_key),
                    )
                    mid_ids[(cat["key"], mid_key)] = cur.fetchone()[0]

            sub_count = 0
            for cat in taxonomy["categories"]:
                for mid_key, subs in cat["mids"].items():
                    for sub in subs:
                        cur.execute(
                            "INSERT INTO category_sub (mid_id, key) VALUES (%s, %s)",
                            (mid_ids[(cat["key"], mid_key)], sub),
                        )
                        sub_count += 1

            print(f"  → major {len(major_ids)}, mid {len(mid_ids)}, sub {sub_count}")

            print("=== 3. audio_assets에 FK 컬럼 추가 ===")
            cur.execute("""
                ALTER TABLE audio_assets
                  ADD COLUMN IF NOT EXISTS major_id INT,
                  ADD COLUMN IF NOT EXISTS mid_id INT,
                  ADD COLUMN IF NOT EXISTS sub_id INT;
            """)

            print("=== 3.5. 누락된 v2.x 마이그레이션 사전 정리 ===")
            # Ambience > Mechanical → Ambience > Machine_Room
            cur.execute("""
                UPDATE audio_assets SET mid = 'Machine_Room'
                WHERE major = 'Ambience' AND mid = 'Mechanical'
            """)
            print(f"  Ambience>Mechanical → Machine_Room: {cur.rowcount}건")
            # SFX > Whoosh → Cinematic > Whoosh (major도 변경)
            cur.execute("""
                UPDATE audio_assets SET major = 'Cinematic'
                WHERE major = 'SFX' AND mid = 'Whoosh'
            """)
            print(f"  SFX>Whoosh → Cinematic>Whoosh: {cur.rowcount}건")
            # Cinematic > UI → SFX > UI
            cur.execute("""
                UPDATE audio_assets SET major = 'SFX'
                WHERE major = 'Cinematic' AND mid = 'UI'
            """)
            print(f"  Cinematic>UI → SFX>UI: {cur.rowcount}건")

            print("=== 4. 기존 VARCHAR → FK 매핑 ===")
            cur.execute("""
                UPDATE audio_assets a
                SET major_id = cm.id
                FROM category_major cm
                WHERE a.major = cm.key;
            """)
            print(f"  major_id 채움: {cur.rowcount}건")

            cur.execute("""
                UPDATE audio_assets a
                SET mid_id = cmid.id
                FROM category_mid cmid
                WHERE cmid.major_id = a.major_id AND cmid.key = a.mid;
            """)
            print(f"  mid_id 채움: {cur.rowcount}건")

            cur.execute("""
                UPDATE audio_assets a
                SET sub_id = cs.id
                FROM category_sub cs
                WHERE cs.mid_id = a.mid_id AND cs.key = a.sub
                  AND a.sub IS NOT NULL;
            """)
            print(f"  sub_id 채움: {cur.rowcount}건")

            print("=== 5. 매핑 검증 ===")
            cur.execute("SELECT count(*) FROM audio_assets WHERE major_id IS NULL")
            null_major = cur.fetchone()[0]
            cur.execute("SELECT count(*) FROM audio_assets WHERE mid_id IS NULL")
            null_mid = cur.fetchone()[0]
            cur.execute("SELECT count(*) FROM audio_assets WHERE sub IS NOT NULL AND sub_id IS NULL")
            null_sub = cur.fetchone()[0]

            print(f"  major_id NULL: {null_major}건")
            print(f"  mid_id NULL: {null_mid}건")
            print(f"  sub→sub_id 매핑 실패: {null_sub}건")

            if null_major > 0 or null_mid > 0:
                # 매핑 실패한 행 출력
                cur.execute("""
                    SELECT id, major, mid, sub FROM audio_assets
                    WHERE major_id IS NULL OR mid_id IS NULL
                    LIMIT 20
                """)
                print("  ⚠️  매핑 실패 샘플:")
                for row in cur.fetchall():
                    print(f"    {row}")
                raise RuntimeError("major/mid 매핑 실패 — 마이그레이션 중단")

            if null_sub > 0:
                # sub만 매핑 실패한 건 NULL로 두고 진행 (경고)
                print(f"  ⚠️  sub {null_sub}건은 NULL로 처리됨")

            print("=== 6. NOT NULL + FK 제약 추가 ===")
            cur.execute("""
                ALTER TABLE audio_assets
                  ALTER COLUMN major_id SET NOT NULL,
                  ALTER COLUMN mid_id SET NOT NULL;
                ALTER TABLE audio_assets
                  ADD CONSTRAINT audio_assets_major_id_fkey FOREIGN KEY (major_id) REFERENCES category_major(id),
                  ADD CONSTRAINT audio_assets_mid_id_fkey FOREIGN KEY (mid_id) REFERENCES category_mid(id),
                  ADD CONSTRAINT audio_assets_sub_id_fkey FOREIGN KEY (sub_id) REFERENCES category_sub(id);
            """)

            print("=== 7. 기존 인덱스/컬럼 DROP ===")
            cur.execute("""
                DROP INDEX IF EXISTS audio_assets_major_idx;
                DROP INDEX IF EXISTS audio_assets_major_mid_idx;
                DROP INDEX IF EXISTS audio_assets_major_mid_sub_idx;
                ALTER TABLE audio_assets
                  DROP COLUMN major,
                  DROP COLUMN mid,
                  DROP COLUMN sub;
                CREATE INDEX audio_assets_major_id_idx ON audio_assets(major_id);
                CREATE INDEX audio_assets_major_id_mid_id_idx ON audio_assets(major_id, mid_id);
                CREATE INDEX audio_assets_major_id_mid_id_sub_id_idx ON audio_assets(major_id, mid_id, sub_id);
            """)

            print("=== 8. 골드셋 플랫폼 테이블 생성 ===")
            cur.execute("""
                CREATE TABLE assignment_round (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    title VARCHAR(200) NOT NULL,
                    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    status VARCHAR(20) NOT NULL DEFAULT 'open',
                    item_count INT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    closed_at TIMESTAMPTZ
                );
                CREATE INDEX assignment_round_status_created_at_idx ON assignment_round(status, created_at);

                CREATE TABLE assignment_item (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    round_id UUID NOT NULL REFERENCES assignment_round(id) ON DELETE CASCADE,
                    audio_asset_id UUID NOT NULL REFERENCES audio_assets(id) ON DELETE CASCADE,
                    status VARCHAR(20) NOT NULL DEFAULT 'pending',
                    agreed_major_id INT REFERENCES category_major(id),
                    agreed_mid_id INT REFERENCES category_mid(id),
                    agreed_sub_id INT REFERENCES category_sub(id),
                    response_count INT NOT NULL DEFAULT 0,
                    UNIQUE(round_id, audio_asset_id)
                );
                CREATE INDEX assignment_item_round_id_status_idx ON assignment_item(round_id, status);

                CREATE TABLE assignment_response (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    item_id UUID NOT NULL REFERENCES assignment_item(id) ON DELETE CASCADE,
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    major_id INT NOT NULL REFERENCES category_major(id),
                    mid_id INT NOT NULL REFERENCES category_mid(id),
                    sub_id INT REFERENCES category_sub(id),
                    responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    UNIQUE(item_id, user_id)
                );
                CREATE INDEX assignment_response_user_id_idx ON assignment_response(user_id);

                CREATE TABLE gold_set (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    audio_asset_id UUID NOT NULL UNIQUE REFERENCES audio_assets(id) ON DELETE CASCADE,
                    major_id INT NOT NULL REFERENCES category_major(id),
                    mid_id INT NOT NULL REFERENCES category_mid(id),
                    sub_id INT REFERENCES category_sub(id),
                    round_id UUID REFERENCES assignment_round(id) ON DELETE SET NULL,
                    agreed_by UUID[] NOT NULL DEFAULT '{}',
                    confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                CREATE INDEX gold_set_major_id_mid_id_idx ON gold_set(major_id, mid_id);
                CREATE INDEX gold_set_confirmed_at_idx ON gold_set(confirmed_at);
            """)

            print("=== 9. _prisma_migrations 기록 추가 ===")
            cur.execute("""
                INSERT INTO _prisma_migrations
                  (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
                VALUES
                  (gen_random_uuid()::text, 'manual-migration', now(), %s, NULL, NULL, now(), 1)
                ON CONFLICT DO NOTHING
            """, (MIGRATION_NAME,))

        conn.commit()
        print("\n✅ 마이그레이션 완료")

        # 검증
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM category_major")
            print(f"category_major: {cur.fetchone()[0]}")
            cur.execute("SELECT count(*) FROM category_mid")
            print(f"category_mid: {cur.fetchone()[0]}")
            cur.execute("SELECT count(*) FROM category_sub")
            print(f"category_sub: {cur.fetchone()[0]}")
            cur.execute("SELECT count(*) FROM audio_assets WHERE major_id IS NOT NULL")
            print(f"audio_assets with major_id: {cur.fetchone()[0]}")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ 오류 발생, 롤백됨: {e}", file=sys.stderr)
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
