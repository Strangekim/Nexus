// 브랜치 그래프 카드 — Git 브랜치 분기/병합 시각화

'use client';

import { GitBranch } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import BranchGraph, { BRANCH_COLORS, GraphRow, ROW_HEIGHT } from './BranchGraph';

// 그래프 목데이터 — 각 행은 하나의 커밋/이벤트
const GRAPH: GraphRow[] = [
  { id: 'g1', hash: 'a1b2c3d', msg: '인증 시스템 구현', author: '김민수', time: '2시간 전', lane: 'auth' },
  { id: 'g2', hash: 'e4f5g6h', msg: '로그인 페이지 UI', author: '이수진', time: '3시간 전', lane: 'chat' },
  { id: 'g3', hash: 'f3g4h5i', msg: 'session-bug 수정 완료', author: '박지훈', time: '4시간 전', lane: 'main', mergeIn: 'fix' },
  { id: 'g4', hash: 'i7j8k9l', msg: 'Prisma 스키마 정의', author: '박지훈', time: '5시간 전', lane: 'fix' },
  { id: 'g5', hash: 'j2k3l4m', msg: 'feature/chat-ui 브랜치 생성', author: '이수진', time: '6시간 전', lane: 'main', branchOut: 'chat' },
  { id: 'g6', hash: 'k5l6m7n', msg: 'feature/auth 브랜치 생성', author: '김민수', time: '8시간 전', lane: 'main', branchOut: 'auth' },
  { id: 'g7', hash: 'm0n1o2p', msg: '프로젝트 초기 세팅', author: '관리자', time: '1일 전', lane: 'main' },
  { id: 'g8', hash: 'q3r4s5t', msg: 'README 작성', author: '관리자', time: '1일 전', lane: 'main' },
];

export default function BranchStatusCard() {
  return (
    <Card className="bg-white border border-[#E8E5DE] shadow-none rounded-xl">
      <CardHeader className="border-b border-[#E8E5DE] pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[#1A1A1A] text-sm font-semibold">
            <GitBranch size={15} className="text-[#E0845E]" />
            브랜치 그래프
          </CardTitle>
          {/* 범례 */}
          <div className="flex items-center gap-3">
            {Object.entries(BRANCH_COLORS).map(([name, color]) => (
              <div key={name} className="flex items-center gap-1">
                <div className="size-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-[#6B6B7B] font-mono">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-2 overflow-x-auto">
        <div className="flex">
          {/* SVG 그래프 영역 */}
          <BranchGraph graph={GRAPH} />

          {/* 텍스트 영역 */}
          <div className="flex-1 min-w-0">
            {GRAPH.map((row) => (
              <div
                key={row.id}
                className="flex items-center hover:bg-[#F5F5EF] rounded-md px-2 transition-colors cursor-pointer"
                style={{ height: ROW_HEIGHT }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] rounded bg-[#F5F5EF] px-1.5 py-0.5 text-[#6B6B7B]">
                      {row.hash}
                    </span>
                    {row.mergeIn && (
                      <span className="text-[10px] rounded-full px-1.5 py-0.5 font-medium"
                        style={{ color: BRANCH_COLORS[row.mergeIn], backgroundColor: `${BRANCH_COLORS[row.mergeIn]}14` }}>
                        merge
                      </span>
                    )}
                    {row.branchOut && (
                      <span className="text-[10px] rounded-full px-1.5 py-0.5 font-medium"
                        style={{ color: BRANCH_COLORS[row.branchOut], backgroundColor: `${BRANCH_COLORS[row.branchOut]}14` }}>
                        branch
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#1A1A1A] truncate mt-0.5">{row.msg}</p>
                </div>
                <div className="shrink-0 text-right ml-3">
                  <p className="text-xs text-[#1A1A1A]">{row.author}</p>
                  <p className="text-[10px] text-[#6B6B7B]">{row.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
