// 오디오 에셋 검색 및 조회 서비스 (FK 정규화 버전)
import prisma from '../lib/prisma.js';
import { embedText, embedImage, embedVideo } from '../lib/embedding.js';
import { getPresignedUrl, getStreamUrl, getDownloadUrl } from '../lib/s3.js';
import { resolveCategoryIds } from './category.service.js';

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

  // 2) 필터 키 → ID 변환
  const ids = filters
    ? await resolveCategoryIds(filters.major, filters.mid, filters.sub)
    : { majorId: null, midId: null, subId: null };

  // 3) pgvector 코사인 유사도 검색 (FK 기반)
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT a.id, a.file_name, a.s3_key,
            cmj.key AS major, cmid.key AS mid, cs.key AS sub,
            a.mood, a.tags, a.description, a.duration, a.format, a.file_size,
            1 - (a.embedding <=> $1::vector) AS similarity
     FROM audio_assets a
     JOIN category_major cmj ON a.major_id = cmj.id
     JOIN category_mid   cmid ON a.mid_id   = cmid.id
     LEFT JOIN category_sub cs ON a.sub_id = cs.id
     WHERE a.embedding IS NOT NULL
       AND ($2::int IS NULL OR a.major_id = $2)
       AND ($3::int IS NULL OR a.mid_id   = $3)
       AND ($4::int IS NULL OR a.sub_id   = $4)
     ORDER BY a.embedding <=> $1::vector
     LIMIT $5`,
    vectorStr,
    ids.majorId,
    ids.midId,
    ids.subId,
    limit,
  );

  // 4) presigned URL 추가
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
      format: row.format,
      fileSize: row.file_size,
      similarity: parseFloat(row.similarity),
      s3Url: await getPresignedUrl(row.s3_key),
    })),
  );

  return results;
}

/** 카테고리 트리 조회 (audio_assets 카운트 포함) */
export async function getCategories(): Promise<CategoryNode[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT cmj.key AS major, cmid.key AS mid, cs.key AS sub, count(*)::int AS count
     FROM audio_assets a
     JOIN category_major cmj ON a.major_id = cmj.id
     JOIN category_mid   cmid ON a.mid_id   = cmid.id
     LEFT JOIN category_sub cs ON a.sub_id = cs.id
     GROUP BY cmj.key, cmid.key, cs.key
     ORDER BY cmj.key, cmid.key, cs.key`,
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
  const asset = await prisma.audioAsset.findUnique({
    where: { id },
    include: { major: true, mid: true, sub: true },
  });
  if (!asset) return null;
  const s3Url = await getPresignedUrl(asset.s3Key);
  return {
    ...asset,
    major: asset.major.key,
    mid: asset.mid.key,
    sub: asset.sub?.key ?? null,
    s3Url,
  };
}

/** 카테고리 필터 목록 (페이지네이션) */
export async function listAudio(params: ListParams) {
  const { major, mid, sub, page = 1, limit = 50 } = params;

  // major/mid/sub 키 → ID 변환
  const ids = await resolveCategoryIds(major, mid, sub);

  const where: any = {};
  if (ids.majorId !== null) where.majorId = ids.majorId;
  if (ids.midId !== null) where.midId = ids.midId;
  if (ids.subId !== null) where.subId = ids.subId;

  const [items, total] = await Promise.all([
    prisma.audioAsset.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        major: { select: { key: true } },
        mid: { select: { key: true } },
        sub: { select: { key: true } },
      },
    }),
    prisma.audioAsset.count({ where }),
  ]);

  // major/mid/sub 객체를 키 문자열로 평탄화
  const flatItems = items.map((it) => ({
    id: it.id,
    fileName: it.fileName,
    s3Key: it.s3Key,
    major: it.major.key,
    mid: it.mid.key,
    sub: it.sub?.key ?? null,
    mood: it.mood,
    tags: it.tags,
    description: it.description,
    duration: it.duration,
    format: it.format,
    fileSize: it.fileSize,
  }));

  return { items: flatItems, total, page, limit, totalPages: Math.ceil(total / limit) };
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
    include: {
      major: { select: { key: true } },
      mid: { select: { key: true } },
      sub: { select: { key: true } },
    },
  });
  return assets.map((a) => ({
    id: a.id,
    fileName: a.fileName,
    s3Key: a.s3Key,
    major: a.major.key,
    mid: a.mid.key,
    sub: a.sub?.key ?? null,
    mood: a.mood,
    tags: a.tags,
    description: a.description,
    duration: a.duration,
    format: a.format,
    fileSize: a.fileSize,
  }));
}

/** 라이브러리 통계 */
export async function getAudioStats() {
  const [total, byMajor, byFormat] = await Promise.all([
    prisma.audioAsset.count(),
    prisma.$queryRawUnsafe<{ major: string; count: number }[]>(
      `SELECT cmj.key AS major, count(*)::int AS count
       FROM audio_assets a
       JOIN category_major cmj ON a.major_id = cmj.id
       GROUP BY cmj.key ORDER BY count DESC`,
    ),
    prisma.$queryRawUnsafe<{ format: string; count: number }[]>(
      `SELECT format, count(*)::int AS count FROM audio_assets GROUP BY format ORDER BY count DESC`,
    ),
  ]);
  return { total, byMajor, byFormat };
}
