// 골드셋 라운드 + 응답 + 자동 판정 서비스
import prisma from '../lib/prisma.js';
import { validateCategory } from './category.service.js';

interface CreateRoundParams {
  title: string;
  count: number;
  strategy?: 'random' | 'sparse_category';
  excludeGoldSet?: boolean;
  createdBy: string;
}

/** 팀원 수 (전원 일치 판정 기준) */
async function getTeamSize(): Promise<number> {
  // admin도 응답 대상 — 전체 활성 사용자 수 사용
  return prisma.user.count();
}

/** 라운드 생성 (관리자) */
export async function createRound(params: CreateRoundParams) {
  const { title, count, strategy = 'random', excludeGoldSet = true, createdBy } = params;

  // 1) 후보 audio_asset 풀 결정
  let audioIds: string[];
  if (strategy === 'sparse_category') {
    // 골드셋이 적은 카테고리 우선 — count 적은 major부터 균등 샘플
    const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT a.id FROM audio_assets a
       LEFT JOIN gold_set g ON g.audio_asset_id = a.id
       WHERE ($1::bool = false OR g.id IS NULL)
       ORDER BY (
         SELECT count(*) FROM gold_set gs WHERE gs.major_id = a.major_id
       ) ASC, random()
       LIMIT $2`,
      excludeGoldSet,
      count,
    );
    audioIds = rows.map((r) => r.id);
  } else {
    // random
    const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT a.id FROM audio_assets a
       LEFT JOIN gold_set g ON g.audio_asset_id = a.id
       WHERE ($1::bool = false OR g.id IS NULL)
       ORDER BY random()
       LIMIT $2`,
      excludeGoldSet,
      count,
    );
    audioIds = rows.map((r) => r.id);
  }

  if (audioIds.length === 0) {
    throw new Error('샘플 가능한 오디오가 없습니다');
  }

  // 2) round + items 일괄 생성
  const round = await prisma.assignmentRound.create({
    data: {
      title,
      createdBy,
      itemCount: audioIds.length,
      items: {
        create: audioIds.map((id) => ({ audioAssetId: id })),
      },
    },
    include: { items: true },
  });

  return round;
}

/** 라운드 목록 — 내 진행률 포함 */
export async function listRounds(userId: string) {
  const rounds = await prisma.assignmentRound.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      creator: { select: { id: true, name: true } },
      _count: { select: { items: true } },
    },
  });

  // 내가 응답한 item 수 계산 (배치)
  const roundIds = rounds.map((r) => r.id);
  const myResponses = await prisma.assignmentResponse.findMany({
    where: {
      userId,
      item: { roundId: { in: roundIds } },
    },
    select: { item: { select: { roundId: true } } },
  });

  const myCountByRound = new Map<string, number>();
  for (const r of myResponses) {
    myCountByRound.set(r.item.roundId, (myCountByRound.get(r.item.roundId) ?? 0) + 1);
  }

  return rounds.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    itemCount: r._count.items,
    myProgress: myCountByRound.get(r.id) ?? 0,
    creator: r.creator,
    createdAt: r.createdAt,
    closedAt: r.closedAt,
  }));
}

/** 라운드 상세 — items + 내 응답 매핑 */
export async function getRoundDetail(roundId: string, userId: string) {
  const round = await prisma.assignmentRound.findUnique({
    where: { id: roundId },
    include: {
      creator: { select: { id: true, name: true } },
      items: {
        include: {
          audioAsset: {
            select: { id: true, fileName: true, s3Key: true, duration: true, format: true },
          },
          responses: {
            where: { userId },
            include: {
              major: { select: { key: true } },
              mid: { select: { key: true } },
              sub: { select: { key: true } },
            },
          },
          agreedMajor: { select: { key: true } },
          agreedMid: { select: { key: true } },
          agreedSub: { select: { key: true } },
        },
      },
    },
  });
  if (!round) return null;

  return {
    id: round.id,
    title: round.title,
    status: round.status,
    createdAt: round.createdAt,
    creator: round.creator,
    items: round.items.map((it) => ({
      id: it.id,
      audioAsset: it.audioAsset,
      status: it.status,
      responseCount: it.responseCount,
      myResponse: it.responses[0]
        ? {
            major: it.responses[0].major.key,
            mid: it.responses[0].mid.key,
            sub: it.responses[0].sub?.key ?? null,
          }
        : null,
      agreed:
        it.status === 'agreed' && it.agreedMajor
          ? {
              major: it.agreedMajor.key,
              mid: it.agreedMid?.key ?? '',
              sub: it.agreedSub?.key ?? null,
            }
          : null,
    })),
  };
}

/** 라운드 마감 (관리자) */
export async function closeRound(roundId: string) {
  return prisma.assignmentRound.update({
    where: { id: roundId },
    data: { status: 'closed', closedAt: new Date() },
  });
}

/** 응답 제출 + 전원 응답 시 일치 판정 */
export async function submitResponse(params: {
  itemId: string;
  userId: string;
  major: string;
  mid: string;
  sub: string | null;
}) {
  const { itemId, userId, major, mid, sub } = params;

  // 카테고리 검증
  const ids = await validateCategory(major, mid, sub);

  // 트랜잭션 — UPSERT + 카운터 + 일치 판정
  return prisma.$transaction(async (tx) => {
    // 기존 응답 여부 확인
    const existing = await tx.assignmentResponse.findUnique({
      where: { itemId_userId: { itemId, userId } },
    });

    if (existing) {
      // 수정
      await tx.assignmentResponse.update({
        where: { itemId_userId: { itemId, userId } },
        data: { majorId: ids.majorId, midId: ids.midId, subId: ids.subId },
      });
    } else {
      await tx.assignmentResponse.create({
        data: {
          itemId,
          userId,
          majorId: ids.majorId,
          midId: ids.midId,
          subId: ids.subId,
        },
      });
      await tx.assignmentItem.update({
        where: { id: itemId },
        data: { responseCount: { increment: 1 } },
      });
    }

    // 현재 item 상태 조회
    const item = await tx.assignmentItem.findUnique({
      where: { id: itemId },
      include: { responses: true },
    });
    if (!item) throw new Error('item 없음');

    // 전원 응답 여부 확인
    const teamSize = await getTeamSize();
    if (item.responses.length < teamSize) {
      return { item, judged: false as const };
    }

    // 전원 일치 여부
    const first = item.responses[0];
    const allAgree = item.responses.every(
      (r) =>
        r.majorId === first.majorId &&
        r.midId === first.midId &&
        (r.subId ?? null) === (first.subId ?? null),
    );

    if (allAgree) {
      // agreed → gold_set INSERT
      await tx.assignmentItem.update({
        where: { id: itemId },
        data: {
          status: 'agreed',
          agreedMajorId: first.majorId,
          agreedMidId: first.midId,
          agreedSubId: first.subId,
        },
      });

      await tx.goldSet.upsert({
        where: { audioAssetId: item.audioAssetId },
        create: {
          audioAssetId: item.audioAssetId,
          majorId: first.majorId,
          midId: first.midId,
          subId: first.subId,
          roundId: item.roundId,
          agreedBy: item.responses.map((r) => r.userId),
        },
        update: {
          majorId: first.majorId,
          midId: first.midId,
          subId: first.subId,
          roundId: item.roundId,
          agreedBy: item.responses.map((r) => r.userId),
          confirmedAt: new Date(),
        },
      });

      return { item, judged: true as const, agreed: true };
    } else {
      await tx.assignmentItem.update({
        where: { id: itemId },
        data: { status: 'disagreed' },
      });
      return { item, judged: true as const, agreed: false };
    }
  });
}

/** 라운드 결과 (관리자) — 일치/불일치 분포 */
export async function getRoundResults(roundId: string) {
  const items = await prisma.assignmentItem.findMany({
    where: { roundId },
    include: {
      audioAsset: { select: { id: true, fileName: true, s3Key: true } },
      responses: {
        include: {
          user: { select: { id: true, name: true } },
          major: { select: { key: true } },
          mid: { select: { key: true } },
          sub: { select: { key: true } },
        },
      },
      agreedMajor: { select: { key: true } },
      agreedMid: { select: { key: true } },
      agreedSub: { select: { key: true } },
    },
  });

  const agreed = items.filter((i) => i.status === 'agreed').length;
  const disagreed = items.filter((i) => i.status === 'disagreed').length;
  const pending = items.filter((i) => i.status === 'pending').length;

  return {
    summary: { total: items.length, agreed, disagreed, pending },
    items: items.map((it) => ({
      id: it.id,
      audioAsset: it.audioAsset,
      status: it.status,
      agreed:
        it.agreedMajor && it.agreedMid
          ? {
              major: it.agreedMajor.key,
              mid: it.agreedMid.key,
              sub: it.agreedSub?.key ?? null,
            }
          : null,
      responses: it.responses.map((r) => ({
        userId: r.userId,
        userName: r.user.name,
        major: r.major.key,
        mid: r.mid.key,
        sub: r.sub?.key ?? null,
      })),
    })),
  };
}
