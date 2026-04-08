// 환경변수 로딩 및 검증
import 'dotenv/config';

interface Env {
  DATABASE_URL: string;
  PORT: number;
  SESSION_SECRET: string;
  FRONTEND_URL: string;
  NODE_ENV: 'development' | 'production';
  // DB 민감 데이터 암호화 키 — 64자 hex (32바이트). 미설정 시 claudeAccount 평문 저장
  ENCRYPTION_KEY?: string;
  // 알리고 SMS — optional (미설정 시 SMS 비활성화)
  ALIGO_API_KEY?: string;
  ALIGO_USER_ID?: string;
  ALIGO_SENDER?: string;
  // 오디오 검색 — optional
  GOOGLE_API_KEY?: string;
  AWS_S3_BUCKET?: string;
  AWS_REGION?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
}

function loadEnv(): Env {
  const required = ['DATABASE_URL', 'SESSION_SECRET'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`환경변수 ${key}가 설정되지 않았습니다`);
    }
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    PORT: parseInt(process.env.PORT || '8080', 10),
    SESSION_SECRET: process.env.SESSION_SECRET!,
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    NODE_ENV: (process.env.NODE_ENV as Env['NODE_ENV']) || 'development',
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    ALIGO_API_KEY: process.env.ALIGO_API_KEY,
    ALIGO_USER_ID: process.env.ALIGO_USER_ID,
    ALIGO_SENDER: process.env.ALIGO_SENDER,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    AWS_REGION: process.env.AWS_REGION || 'ap-northeast-2',
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

export const env = loadEnv();
