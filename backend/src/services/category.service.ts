// 카테고리 마스터 조회 + 키↔ID 변환 헬퍼
import prisma from '../lib/prisma.js';

export interface CategoryTree {
  key: string;
  label: string;
  mids: { name: string; subs: string[] }[];
}

/** 전체 카테고리 트리 (마스터 데이터) */
export async function getCategoryTree(): Promise<CategoryTree[]> {
  const majors = await prisma.categoryMajor.findMany({
    orderBy: { id: 'asc' },
    include: {
      mids: {
        orderBy: { id: 'asc' },
        include: { subs: { orderBy: { id: 'asc' } } },
      },
    },
  });

  return majors.map((m) => ({
    key: m.key,
    label: m.label,
    mids: m.mids.map((mid) => ({
      name: mid.key,
      subs: mid.subs.map((s) => s.key),
    })),
  }));
}

/** 키 문자열 → ID 변환 (필터 조회용) */
export async function resolveCategoryIds(
  major?: string | null,
  mid?: string | null,
  sub?: string | null,
): Promise<{ majorId: number | null; midId: number | null; subId: number | null }> {
  if (!major) return { majorId: null, midId: null, subId: null };

  const majorRow = await prisma.categoryMajor.findUnique({ where: { key: major } });
  if (!majorRow) return { majorId: null, midId: null, subId: null };

  if (!mid) return { majorId: majorRow.id, midId: null, subId: null };

  const midRow = await prisma.categoryMid.findUnique({
    where: { majorId_key: { majorId: majorRow.id, key: mid } },
  });
  if (!midRow) return { majorId: majorRow.id, midId: null, subId: null };

  if (!sub) return { majorId: majorRow.id, midId: midRow.id, subId: null };

  const subRow = await prisma.categorySub.findUnique({
    where: { midId_key: { midId: midRow.id, key: sub } },
  });
  return {
    majorId: majorRow.id,
    midId: midRow.id,
    subId: subRow?.id ?? null,
  };
}

/** 키 3개 모두 검증 (분류 응답 제출용) — 미존재 시 throw */
export async function validateCategory(
  major: string,
  mid: string,
  sub: string | null,
): Promise<{ majorId: number; midId: number; subId: number | null }> {
  const majorRow = await prisma.categoryMajor.findUnique({ where: { key: major } });
  if (!majorRow) throw new Error(`존재하지 않는 major: ${major}`);

  const midRow = await prisma.categoryMid.findUnique({
    where: { majorId_key: { majorId: majorRow.id, key: mid } },
  });
  if (!midRow) throw new Error(`존재하지 않는 mid: ${major}>${mid}`);

  let subId: number | null = null;
  if (sub) {
    const subRow = await prisma.categorySub.findUnique({
      where: { midId_key: { midId: midRow.id, key: sub } },
    });
    if (!subRow) throw new Error(`존재하지 않는 sub: ${major}>${mid}>${sub}`);
    subId = subRow.id;
  }

  return { majorId: majorRow.id, midId: midRow.id, subId };
}
