// S3 presigned URL 생성 유틸리티
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

function getS3Client(): S3Client {
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS 자격증명이 설정되지 않았습니다');
  }
  return new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

/** S3 객체의 presigned URL 생성 (기본 15분 만료) */
export async function getPresignedUrl(s3Key: string, expiresIn = 900): Promise<string> {
  if (!env.AWS_S3_BUCKET) {
    throw new Error('AWS_S3_BUCKET이 설정되지 않았습니다');
  }
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: s3Key,
  });
  return getSignedUrl(client, command, { expiresIn });
}
