// 오디오 에셋 검색 및 조회 서비스
import prisma from '../lib/prisma.js';
import { embedText, embedImage, embedVideo } from '../lib/embedding.js';
import { getPresignedUrl, getStreamUrl, getDownloadUrl } from '../lib/s3.js';

interface SearchParams {
  query: string | Buffer;
  modality: 'text' | 'image' | 'video';
  mimeType?: string;
  filters?: { major?: string; mid?: string; sub?: string };
  limit?: number;
}

interface AudioSearchResult {
  id: string;
  fileName: string;
  s3Key: string;
  major: string;
  mid: string;
  sub: string | null;
  mood: string[];
  tags: string[];
  description: string;
  duration: number | null;
  similarity: number;
  s3Url: string;
}

interface CategoryNode {
  major: string;
  children: { mid: string; children: string[]; count: number }[];
  count: number;
}

interface ListParams {
  major?: string;
  mid?: string;
  sub?: string;
  page?: number;
  limit?: number;
}

/** 멀티모달 유사도 검색 */
export async function searchAudio(params: SearchParams): Promise<AudioSearchResult[]> {
  const { query, modality, mimeType, filters, limit = 20 } = params;

  // 1) 쿼리 임베딩 생성
  let embedding: number[];
  if (modality === 'text') {
    embedding = await embedText(query as string);
  } else if (modality === 'image') {
    embedding = await embedImage(query as Buffer, mimeType || 'image/jpeg');
  } else {
    embedding = await embedVideo(query as Buffer, mimeType || 'video/mp4');
  }

  const vectorStr = `[${embedding.join(',')}]`;

  // 2) pgvector 코사인 유사도 검색
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, file_name, s3_key, major, mid, sub,
            mood, tags, description, duration,
            1 - (embedding <=> $1::vector) AS similarity
     FROM audio_assets
     WHERE embedding IS NOT NULL
       AND ($2::text IS NULL OR major = $2)
       AND ($3::text IS NULL OR mid = $3)
       AND ($4::text IS NULL OR sub = $4)
     ORDER BY embedding <=> $1::vector
     LIMIT $5`,
    vectorStr,
    filters?.major || null,
    filters?.mid || null,
    filters?.sub || null,
    limit,
  );

  // 3) presigned URL 추가
  const results: AudioSearchResult[] = await Promise.all(
    rows.map(async (row: any) => ({
      id: row.id,
      fileName: row.file_name,
      s3Key: row.s3_key,
      major: row.major,
      mid: row.mid,
      sub: row.sub,
      mood: row.mood || [],
      tags: row.tags || [],
      description: row.description,
      duration: row.duration,
      similarity: parseFloat(row.similarity),
      s3Url: await getPresignedUrl(row.s3_key),
    })),
  );

  return results;
}

/** 카테고리 트리 조회 */
export async function getCategories(): Promise<CategoryNode[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT major, mid, sub, count(*)::int AS count
     FROM audio_assets
     GROUP BY major, mid, sub
     ORDER BY major, mid, sub`,
  );

  const tree: Map<string, Map<string, { subs: string[]; count: number }>> = new Map();

  for (const row of rows) {
    if (!tree.has(row.major)) tree.set(row.major, new Map());
    const midMap = tree.get(row.major)!;
    if (!midMap.has(row.mid)) midMap.set(row.mid, { subs: [], count: 0 });
    const midEntry = midMap.get(row.mid)!;
    midEntry.count += row.count;
    if (row.sub) midEntry.subs.push(row.sub);
  }

  const result: CategoryNode[] = [];
  for (const [major, midMap] of tree) {
    let totalCount = 0;
    const children = [];
    for (const [mid, data] of midMap) {
      totalCount += data.count;
      children.push({ mid, children: data.subs, count: data.count });
    }
    result.push({ major, children, count: totalCount });
  }

  return result;
}

/** 단건 조회 + presigned URL */
export async function getAudioById(id: string) {
  const asset = await prisma.audioAsset.findUnique({ where: { id } });
  if (!asset) return null;
  const s3Url = await getPresignedUrl(asset.s3Key);
  return { ...asset, s3Url };
}

/** 카테고리 필터 목록 (페이지네이션) */
export async function listAudio(params: ListParams) {
  const { major, mid, sub, page = 1, limit = 50 } = params;
  const where: any = {};
  if (major) where.major = major;
  if (mid) where.mid = mid;
  if (sub) where.sub = sub;

  const [items, total] = await Promise.all([
    prisma.audioAsset.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        s3Key: true,
        major: true,
        mid: true,
        sub: true,
        mood: true,
        tags: true,
        description: true,
        duration: true,
        format: true,
        fileSize: true,
      },
    }),
    prisma.audioAsset.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

/** 스트리밍용 presigned URL (짧은 TTL) */
export async function getAudioStreamUrl(id: string): Promise<string | null> {
  const asset = await prisma.audioAsset.findUnique({
    where: { id },
    select: { s3Key: true },
  });
  if (!asset) return null;
  return getStreamUrl(asset.s3Key);
}

/** 다운로드용 presigned URL (Content-Disposition 포함) */
export async function getAudioDownloadUrl(id: string): Promise<string | null> {
  const asset = await prisma.audioAsset.findUnique({
    where: { id },
    select: { s3Key: true, fileName: true },
  });
  if (!asset) return null;
  return getDownloadUrl(asset.s3Key, asset.fileName);
}

/** 복수 에셋 일괄 조회 */
export async function getAudioBatch(ids: string[]) {
  const assets = await prisma.audioAsset.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      fileName: true,
      s3Key: true,
      major: true,
      mid: true,
      sub: true,
      mood: true,
      tags: true,
      description: true,
      duration: true,
      format: true,
      fileSize: true,
    },
  });
  return assets;
}

/** 라이브러리 통계 */
export async function getAudioStats() {
  const [total, byMajor, byFormat] = await Promise.all([
    prisma.audioAsset.count(),
    prisma.$queryRawUnsafe<{ major: string; count: number }[]>(
      `SELECT major, count(*)::int AS count FROM audio_assets GROUP BY major ORDER BY count DESC`,
    ),
    prisma.$queryRawUnsafe<{ format: string; count: number }[]>(
      `SELECT format, count(*)::int AS count FROM audio_assets GROUP BY format ORDER BY count DESC`,
    ),
  ]);
  return { total, byMajor, byFormat };
}
