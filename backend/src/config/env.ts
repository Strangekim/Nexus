// 환경변수 로딩 및 검증
import 'dotenv/config';

interface Env {
  DATABASE_URL: string;
  PORT: number;
  SESSION_SECRET: string;
  FRONTEND_URL: string;
  NODE_ENV: 'development' | 'production';
  // 알리고 SMS — optional (미설정 시 SMS 비활성화)
  ALIGO_API_KEY?: string;
  ALIGO_USER_ID?: string;
  ALIGO_SENDER?: string;
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
    ALIGO_API_KEY: process.env.ALIGO_API_KEY,
    ALIGO_USER_ID: process.env.ALIGO_USER_ID,
    ALIGO_SENDER: process.env.ALIGO_SENDER,
  };
}

export const env = loadEnv();
