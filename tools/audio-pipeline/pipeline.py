"""오디오 파이프라인 CLI 오케스트레이터

사용법:
    python pipeline.py --source /path/to/sound_library --step all
    python pipeline.py --source /path/to/sound_library --step classify
    python pipeline.py --source /path/to/sound_library --step upload
    python pipeline.py --source /path/to/sound_library --step embed
    python pipeline.py --source /path/to/sound_library --step insert
    python pipeline.py --source /path/to/sound_library --step all --dry-run
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# .env 로드
load_dotenv()

# manifest 경로
MANIFEST_DIR = Path(__file__).parent / "manifest"
CLASSIFY_MANIFEST = str(MANIFEST_DIR / "classify.jsonl")
UPLOAD_MANIFEST = str(MANIFEST_DIR / "upload.jsonl")
EMBED_MANIFEST = str(MANIFEST_DIR / "embed.jsonl")


async def run_classify(source: str, dry_run: bool) -> None:
    from classify import classify_all
    await classify_all(source, CLASSIFY_MANIFEST, dry_run=dry_run)


async def run_upload(dry_run: bool) -> None:
    from upload_s3 import upload_all
    upload_all(CLASSIFY_MANIFEST, UPLOAD_MANIFEST, dry_run=dry_run)


async def run_embed(dry_run: bool) -> None:
    from embed import embed_all
    await embed_all(CLASSIFY_MANIFEST, EMBED_MANIFEST, dry_run=dry_run)


async def run_insert(dry_run: bool) -> None:
    from db import insert_all
    insert_all(CLASSIFY_MANIFEST, UPLOAD_MANIFEST, EMBED_MANIFEST, dry_run=dry_run)


async def main() -> None:
    parser = argparse.ArgumentParser(description="오디오 분류 + S3 업로드 + 임베딩 파이프라인")
    parser.add_argument("--source", required=True, help="오디오 소스 디렉토리 경로")
    parser.add_argument(
        "--step",
        choices=["all", "classify", "upload", "embed", "insert"],
        default="all",
        help="실행할 단계 (기본: all)",
    )
    parser.add_argument("--dry-run", action="store_true", help="실제 API 호출 없이 파일 목록만 확인")
    args = parser.parse_args()

    # 소스 디렉토리 확인
    if not os.path.isdir(args.source):
        print(f"오류: 소스 디렉토리가 존재하지 않습니다: {args.source}")
        sys.exit(1)

    # manifest 디렉토리 생성
    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)

    print(f"소스: {args.source}")
    print(f"단계: {args.step}")
    print(f"드라이런: {args.dry_run}")
    print("=" * 60)

    steps = {
        "classify": lambda: run_classify(args.source, args.dry_run),
        "upload": lambda: run_upload(args.dry_run),
        "embed": lambda: run_embed(args.dry_run),
        "insert": lambda: run_insert(args.dry_run),
    }

    if args.step == "all":
        for step_name, step_fn in steps.items():
            print(f"\n{'=' * 60}")
            print(f"[{step_name.upper()}] 시작")
            print(f"{'=' * 60}")
            await step_fn()
    else:
        await steps[args.step]()

    print(f"\n{'=' * 60}")
    print("파이프라인 완료!")


if __name__ == "__main__":
    asyncio.run(main())
