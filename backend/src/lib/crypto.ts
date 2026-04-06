// AES-256-GCM 암호화/복호화 유틸
// claudeAccount 등 DB에 저장되는 민감 데이터 보호용
import crypto from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
/** 암호화된 값의 접두사 — 평문과 구분 */
const ENCRYPTED_PREFIX = 'enc:';

/** 32바이트 암호화 키 캐시 — 모듈 수명 동안 1회만 파싱 */
let cachedKey: Buffer | null = null;

/** 환경변수에서 32바이트 암호화 키 로드 (hex 인코딩 64자) */
function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const keyHex = env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY 환경변수가 설정되지 않았거나 형식이 올바르지 않습니다 (64자 hex 필요)');
  }
  cachedKey = Buffer.from(keyHex, 'hex');
  return cachedKey;
}

/** 평문을 AES-256-GCM으로 암호화 → "enc:{iv}:{tag}:{ciphertext}" (모두 base64) */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

/** 암호화된 문자열을 복호화 — 평문(비암호화)이면 그대로 반환 */
export function decrypt(ciphertext: string): string {
  // 암호화 접두사가 없으면 마이그레이션 전 평문 → 그대로 반환
  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
    return ciphertext;
  }

  const key = getKey();
  const parts = ciphertext.slice(ENCRYPTED_PREFIX.length).split(':');
  if (parts.length !== 3) throw new Error('암호화 데이터 형식 오류');

  const iv = Buffer.from(parts[0], 'base64');
  const tag = Buffer.from(parts[1], 'base64');
  const encrypted = Buffer.from(parts[2], 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

/** 값이 암호화되어 있는지 확인 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}
