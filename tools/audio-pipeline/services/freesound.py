"""Freesound API 클라이언트"""

import os

import requests

FREESOUND_BASE = "https://freesound.org/apiv2"


def get_api_key() -> str:
    """환경변수에서 API 키"""
    return os.environ.get("FREESOUND_API_KEY", "")


def search(query: str, *, sort: str = "downloads_desc", page_size: int = 15,
           min_duration: int = 1, max_duration: int = 120,
           max_filesize: int = 52428800) -> list[dict]:
    """
    Freesound 텍스트 검색.
    sort: rating_desc, downloads_desc, created_desc, duration_desc, score
    반환: [{ id, name, duration, filesize, avg_rating, num_ratings, num_downloads, type, previews, tags }]
    """
    params = {
        "query": query,
        "sort": sort,
        "page_size": page_size,
        "fields": "id,name,duration,filesize,avg_rating,num_ratings,num_downloads,type,previews,tags",
        "filter": f"duration:[{min_duration} TO {max_duration}] filesize:[10000 TO {max_filesize}]",
        "token": get_api_key(),
    }
    resp = requests.get(f"{FREESOUND_BASE}/search/text/", params=params, timeout=30)
    resp.raise_for_status()
    return resp.json().get("results", [])


def download_preview(sound: dict) -> tuple[bytes, str, str] | None:
    """
    HQ 프리뷰 다운로드 (API 키만으로 가능).
    반환: (audio_bytes, format, filename) 또는 None
    """
    previews = sound.get("previews", {})
    url = previews.get("preview-hq-ogg") or previews.get("preview-hq-mp3")
    if not url:
        return None

    fmt = "ogg" if "ogg" in url else "mp3"
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()

    # 파일명 안전하게 변환
    safe_name = "".join(c if c.isalnum() or c in "._- ()" else "_" for c in sound["name"][:80])
    filename = f"freesound_{sound['id']}_{safe_name}.{fmt}"
    return resp.content, fmt, filename
