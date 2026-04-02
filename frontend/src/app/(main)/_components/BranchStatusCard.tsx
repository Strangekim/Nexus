// 브랜치 상태 카드 — 실제 API 데이터 기반 브랜치 목록 표시
'use client';

import { GitBranch, ArrowUp, ArrowDown, GitMerge, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useBranches } from '@/hooks/useBranches';
import type { BranchItem } from '@/services/api/branches';

interface Props {
  projectId: string;
}

/** 브랜치 상태별 배지 컴포넌트 */
function StatusBadge({ item }: { item: BranchItem }) {
  if (item.status === 'ahead') {
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-medium text-[#2D7D7B] bg-[#2D7D7B14] rounded-full px-2 py-0.5">
        <ArrowUp size={10} />
        {item.aheadCount}
      </span>
    );
  }
  if (item.status === 'behind') {
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-medium text-[#E0845E] bg-[#E0845E14] rounded-full px-2 py-0.5">
        <ArrowDown size={10} />
        {item.behindCount}
      </span>
    );
  }
  if (item.status === 'diverged') {
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-medium text-[#9CA3AF] bg-[#9CA3AF14] rounded-full px-2 py-0.5">
        <GitMerge size={10} />
        {item.aheadCount}↑ {item.behindCount}↓
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-medium text-[#16a34a] bg-[#16a34a14] rounded-full px-2 py-0.5">
      <CheckCircle size={10} />
      최신
    </span>
  );
}

export default function BranchStatusCard({ projectId }: Props) {
  const { data, isLoading, isError } = useBranches(projectId);
  const branches = data?.branches ?? [];

  return (
    <Card className="bg-white border border-[#E8E5DE] shadow-none rounded-xl">
      <CardHeader className="border-b border-[#E8E5DE] pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[#1A1A1A] text-sm font-semibold">
            <GitBranch size={15} className="text-[#E0845E]" />
            브랜치 상태
          </CardTitle>
          <span className="text-[10px] text-[#6B6B7B]">
            {branches.length > 0 ? `${branches.length}개 브랜치` : ''}
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-2 overflow-y-auto max-h-[420px]">
        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex flex-col gap-2 py-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 rounded-md bg-[#F5F5EF] animate-pulse" />
            ))}
          </div>
        )}

        {/* 에러 상태 */}
        {isError && !isLoading && (
          <p className="py-8 text-center text-sm text-[#6B6B7B]">
            브랜치 정보를 불러오지 못했습니다.
          </p>
        )}

        {/* 데이터 없음 */}
        {!isLoading && !isError && branches.length === 0 && (
          <p className="py-8 text-center text-sm text-[#6B6B7B]">
            브랜치 정보가 없습니다.
          </p>
        )}

        {/* 브랜치 목록 */}
        {!isLoading && branches.map((branch) => (
          <div
            key={branch.name}
            className="flex items-center justify-between hover:bg-[#F5F5EF] rounded-md px-2 py-2.5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              {/* 현재 브랜치 표시 점 */}
              <span
                className="shrink-0 size-2 rounded-full"
                style={{ backgroundColor: branch.current ? '#16a34a' : '#D1D5DB' }}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-[#1A1A1A] truncate">{branch.name}</span>
                  {branch.current && (
                    <span className="text-[10px] text-[#16a34a] bg-[#16a34a14] rounded-full px-1.5 py-0.5 font-medium shrink-0">
                      HEAD
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[10px] rounded bg-[#F5F5EF] px-1.5 py-0.5 text-[#6B6B7B]">
                    {branch.hash}
                  </span>
                  {branch.author && (
                    <span className="text-[10px] text-[#6B6B7B] truncate">{branch.author}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="shrink-0 ml-3">
              <StatusBadge item={branch} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
