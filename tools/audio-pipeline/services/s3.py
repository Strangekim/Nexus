"""S3 클라이언트 및 업로드/다운로드 유틸리티"""

import os
import re
from pathlib import Path

import boto3
import boto3.s3.transfer


def create_client():
    """S3 클라이언트 생성"""
    return boto3.client(
        "s3",
        region_name=os.environ.get("AWS_REGION", "ap-northeast-2"),
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def get_bucket() -> str:
    """환경변수에서 S3 버킷 이름"""
    return os.environ["AWS_S3_BUCKET"]


def get_content_type(file_path: str) -> str:
    """파일 확장자로 Content-Type 결정"""
    ext = Path(file_path).suffix.lower()
    return {
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".ogg": "audio/ogg",
        ".flac": "audio/flac",
    }.get(ext, "application/octet-stream")


def to_kebab(name: str) -> str:
    """문자열을 kebab-case로 변환"""
    name = name.replace("_", "-").replace(" ", "-")
    name = re.sub(r"[^a-zA-Z0-9\-]", "", name)
    name = re.sub(r"-+", "-", name).strip("-").lower()
    return name


def build_s3_key(major: str, mid: str, sub: str | None, filename: str) -> str:
    """분류 결과로 S3 키 생성: audio/{major}/{mid}/{sub}/{filename}"""
    parts = ["audio", to_kebab(major), to_kebab(mid)]
    if sub:
        parts.append(to_kebab(sub))
    else:
        parts.append("general")
    parts.append(filename)
    return "/".join(parts)


def upload_bytes(client, bucket: str, s3_key: str, data: bytes, content_type: str) -> None:
    """바이트 데이터를 S3에 업로드"""
    client.put_object(Bucket=bucket, Key=s3_key, Body=data, ContentType=content_type)


def upload_file(client, bucket: str, s3_key: str, file_path: str) -> None:
    """로컬 파일을 S3에 업로드 (대용량 멀티파트 지원)"""
    content_type = get_content_type(file_path)
    config = boto3.s3.transfer.TransferConfig(
        multipart_threshold=8 * 1024 * 1024,
        multipart_chunksize=8 * 1024 * 1024,
    )
    client.upload_file(file_path, bucket, s3_key, ExtraArgs={"ContentType": content_type}, Config=config)


def download_bytes(client, bucket: str, s3_key: str) -> bytes:
    """S3에서 바이트 데이터 다운로드"""
    response = client.get_object(Bucket=bucket, Key=s3_key)
    return response["Body"].read()


def get_file_size(client, bucket: str, s3_key: str) -> int:
    """S3 객체 크기 조회"""
    head = client.head_object(Bucket=bucket, Key=s3_key)
    return head["ContentLength"]
