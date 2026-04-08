// Gemini Embedding 2 멀티모달 임베딩 유틸리티
import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';

const MODEL = 'gemini-embedding-exp-03-07';
const DIMENSIONS = 768;

function getClient(): GoogleGenAI {
  if (!env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY가 설정되지 않았습니다');
  }
  return new GoogleGenAI({ apiKey: env.GOOGLE_API_KEY });
}

/** 텍스트 쿼리를 임베딩 벡터로 변환 */
export async function embedText(query: string): Promise<number[]> {
  const client = getClient();
  const result = await client.models.embedContent({
    model: MODEL,
    contents: [{ role: 'user', parts: [{ text: query }] }],
    config: { outputDimensionality: DIMENSIONS },
  });
  return result.embeddings![0].values!;
}

/** 이미지를 임베딩 벡터로 변환 */
export async function embedImage(buffer: Buffer, mimeType: string): Promise<number[]> {
  const client = getClient();
  const base64 = buffer.toString('base64');
  const result = await client.models.embedContent({
    model: MODEL,
    contents: [{ role: 'user', parts: [{ inlineData: { data: base64, mimeType } }] }],
    config: { outputDimensionality: DIMENSIONS },
  });
  return result.embeddings![0].values!;
}

/** 비디오를 임베딩 벡터로 변환 */
export async function embedVideo(buffer: Buffer, mimeType: string): Promise<number[]> {
  const client = getClient();
  const base64 = buffer.toString('base64');
  const result = await client.models.embedContent({
    model: MODEL,
    contents: [{ role: 'user', parts: [{ inlineData: { data: base64, mimeType } }] }],
    config: { outputDimensionality: DIMENSIONS },
  });
  return result.embeddings![0].values!;
}
