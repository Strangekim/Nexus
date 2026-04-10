// 골드셋 조회 + 통계 서비스
import prisma from '../lib/prisma.js';
import { resolveCategoryIds } from './category.service.js';
import { getPresignedUrl } from '../lib/s3.js';

interface ListGoldSetParams {
  major?: string;
  mid?: string;
  sub?: string;
  page?: number;
  limit?: number;
}

/** 골드셋 목록 (필터 + 페이지네이션) */
export async function listGoldSet(params: ListGoldSetParams) {
  const { major, mid, sub, page = 1, limit = 50 } = params;
  const ids = await resolveCategoryIds(major, mid, sub);

  const where: any = {};
  if (ids.majorId !== null) where.majorId = ids.majorId;
  if (ids.midId !== null) where.midId = ids.midId;
  if (ids.subId !== null) where.subId = ids.subId;

  const [items, total] = await Promise.all([
    prisma.goldSet.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { confirmedAt: 'desc' },
      include: {
        audioAsset: {
          select: {
            id: true,
            fileName: true,
            s3Key: true,
            duration: true,
            format: true,
            description: true,
            mood: true,
            tags: true,
          },
        },
        major: { select: { key: true } },
        mid: { select: { key: true } },
        sub: { select: { key: true } },
      },
    }),
    prisma.goldSet.count({ where }),
  ]);

  const enriched = await Promise.all(
    items.map(async (g) => ({
      id: g.id,
      audioAsset: {
        ...g.audioAsset,
        s3Url: await getPresignedUrl(g.audioAsset.s3Key),
      },
      major: g.major.key,
      mid: g.mid.key,
      sub: g.sub?.key ?? null,
      agreedBy: g.agreedBy,
      confirmedAt: g.confirmedAt,
      roundId: g.roundId,
    })),
  );

  return { items: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
}

/** 골드셋 통계 — 전체/대분류별/일별 */
export async function getGoldSetStats() {
  const total = await prisma.goldSet.count();

  const byMajor = await prisma.$queryRawUnsafe<{ major: string; count: number }[]>(
    `SELECT cmj.key AS major, count(*)::int AS count
     FROM gold_set g
     JOIN category_major cmj ON g.major_id = cmj.id
     GROUP BY cmj.key
     ORDER BY count DESC`,
  );

  const byMid = await prisma.$queryRawUnsafe<{ major: string; mid: string; count: number }[]>(
    `SELECT cmj.key AS major, cmid.key AS mid, count(*)::int AS count
     FROM gold_set g
     JOIN category_major cmj ON g.major_id = cmj.id
     JOIN category_mid   cmid ON g.mid_id   = cmid.id
     GROUP BY cmj.key, cmid.key
     ORDER BY cmj.key, count DESC`,
  );

  const recent = await prisma.$queryRawUnsafe<{ day: string; count: number }[]>(
    `SELECT to_char(confirmed_at::date, 'YYYY-MM-DD') AS day, count(*)::int AS count
     FROM gold_set
     WHERE confirmed_at >= now() - interval '30 days'
     GROUP BY day
     ORDER BY day`,
  );

  // 전체 audio_assets 대비 골드셋 비율
  const totalAudio = await prisma.audioAsset.count();
  const coverage = totalAudio > 0 ? total / totalAudio : 0;

  return {
    total,
    totalAudio,
    coverage,
    byMajor,
    byMid,
    recent,
  };
}
