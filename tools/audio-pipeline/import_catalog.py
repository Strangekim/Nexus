"""기존 catalog.json을 classify manifest로 변환

catalog.json에 이미 category_l1/l2/l3 분류가 있으므로
Gemini 분류 없이 바로 manifest로 변환한다.
"""

import json
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

SOURCE_DIR = None  # CLI에서 설정
CATALOG_PATH = None
MANIFEST_DIR = Path(__file__).parent / "manifest"
CLASSIFY_MANIFEST = str(MANIFEST_DIR / "classify.jsonl")


def convert_catalog(source_dir: str) -> int:
    """catalog.json → classify.jsonl 변환"""
    catalog_path = os.path.join(source_dir, "catalog.json")

    with open(catalog_path, "r") as f:
        catalog = json.load(f)

    print(f"catalog.json 항목: {len(catalog)}개")

    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)

    # 기존 manifest 초기화
    count = 0
    with open(CLASSIFY_MANIFEST, "w") as out:
        for item in catalog:
            # Windows 경로를 현재 OS 경로로 변환
            rel_path = item["path"].replace("\\", "/")
            file_path = os.path.join(source_dir, rel_path)

            # 파일 존재 확인
            if not os.path.exists(file_path):
                continue

            entry = {
                "file_path": file_path,
                "file_name": item["file_name"],
                "relative_path": rel_path,
                "major": item["category_l1"],
                "mid": item["category_l2"],
                "sub": item.get("category_l3"),
                "mood": [],
                "tags": [],
                "description": f"{item['category_l1']} / {item['category_l2']} / {item.get('category_l3', '')} — {item['file_name']}",
                "bpm": None,
                "instruments": [],
                "source_library": item.get("source_library", ""),
                "source_folder": item.get("source_folder", ""),
            }

            out.write(json.dumps(entry, ensure_ascii=False) + "\n")
            count += 1

    print(f"변환 완료: {count}개 → {CLASSIFY_MANIFEST}")
    return count


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("사용법: python import_catalog.py <source_dir>")
        sys.exit(1)

    convert_catalog(sys.argv[1])
