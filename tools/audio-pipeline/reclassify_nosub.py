"""sub=null인 파일들을 재분류하는 스크립트

taxonomy에 sub가 정의된 mid인데 sub=null인 파일만 대상으로 한다.
재분류 결과로 classify.jsonl을 업데이트한다.
"""

import asyncio
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from tqdm import tqdm

load_dotenv()

sys.path.insert(0, str(Path(__file__).parent))

from classify import classify_single
from taxonomy import TAXONOMY, VALID_SUBS

from google import genai

CLASSIFY_MANIFEST = Path(__file__).parent / "manifest" / "classify.jsonl"


def find_needs_reclassify() -> list[dict]:
    """sub=null이면서 taxonomy에 sub가 정의된 항목 찾기"""
    entries = []
    with open(CLASSIFY_MANIFEST) as f:
        for line in f:
            if not line.strip():
                continue
            entry = json.loads(line)
            major = entry.get("major", "")
            mid = entry.get("mid", "")
            sub = entry.get("sub")
            # sub가 없고, taxonomy에 sub 목록이 존재하는 경우만
            if not sub and major in VALID_SUBS and mid in VALID_SUBS.get(major, {}) and VALID_SUBS[major][mid]:
                entries.append(entry)
    return entries


def load_all_entries() -> list[dict]:
    """전체 manifest 로드"""
    entries = []
    with open(CLASSIFY_MANIFEST) as f:
        for line in f:
            if line.strip():
                entries.append(json.loads(line))
    return entries


async def reclassify_all():
    """재분류 실행"""
    targets = find_needs_reclassify()
    print(f"재분류 대상: {len(targets)}개")

    if not targets:
        print("재분류할 파일이 없습니다.")
        return

    client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])

    # 재분류 결과 저장 (file_path → 새 결과)
    updates = {}
    batch_size = 10

    with tqdm(total=len(targets), desc="재분류 중") as pbar:
        for i in range(0, len(targets), batch_size):
            batch = targets[i : i + batch_size]
            tasks = [
                classify_single(client, entry["file_path"], entry["file_name"])
                for entry in batch
            ]
            results = await asyncio.gather(*tasks)

            for entry, result in zip(batch, results):
                if result and result.get("sub"):
                    updates[entry["file_path"]] = result
                pbar.update(1)

    print(f"재분류 성공 (sub 획득): {len(updates)}개")

    # manifest 업데이트
    if updates:
        all_entries = load_all_entries()
        updated_count = 0
        for entry in all_entries:
            fp = entry["file_path"]
            if fp in updates:
                new = updates[fp]
                entry["major"] = new["major"]
                entry["mid"] = new["mid"]
                entry["sub"] = new["sub"]
                entry["mood"] = new.get("mood", entry.get("mood", []))
                entry["tags"] = new.get("tags", entry.get("tags", []))
                entry["description"] = new.get("description", entry.get("description", ""))
                updated_count += 1

        # 덮어쓰기
        with open(CLASSIFY_MANIFEST, "w") as f:
            for entry in all_entries:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")

        print(f"manifest 업데이트: {updated_count}개 수정")

    # 결과 확인
    still_null = find_needs_reclassify()
    print(f"여전히 sub=null: {len(still_null)}개")


if __name__ == "__main__":
    asyncio.run(reclassify_all())
