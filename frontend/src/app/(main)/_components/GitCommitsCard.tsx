// 최근 커밋 카드 — 타임라인 스타일 시각화

import { GitCommit } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';

// 최근 커밋 목데이터
const COMMITS = [
  { id: 'c1', msg: '인증 시스템 구현', author: '김민수', time: '2시간 전', hash: 'a1b2c3d', files: 4, adds: 128, dels: 12 },
  { id: 'c2', msg: '로그인 페이지 UI', author: '이수진', time: '3시간 전', hash: 'e4f5g6h', files: 3, adds: 95, dels: 0 },
  { id: 'c3', msg: 'Prisma 스키마 정의', author: '박지훈', time: '5시간 전', hash: 'i7j8k9l', files: 2, adds: 182, dels: 5 },
  { id: 'c4', msg: '프로젝트 초기 세팅', author: '관리자', time: '1일 전', hash: 'm0n1o2p', files: 12, adds: 340, dels: 0 },
  { id: 'c5', msg: 'README 작성', author: '관리자', time: '1일 전', hash: 'q3r4s5t', files: 1, adds: 45, dels: 0 },
];

/** 변경량 막대 — adds/dels 비율 시각화 */
function ChangesBar({ adds, dels }: { adds: number; dels: number }) {
  const total = adds + dels;
  const maxWidth = 80;
  const addW = total > 0 ? Math.max(2, (adds / total) * maxWidth) : 0;
  const delW = total > 0 ? Math.max(2, (dels / total) * maxWidth) : 0;

  return (
    <div className="flex items-center gap-1">
      <div className="flex h-1.5 rounded-full overflow-hidden" style={{ width: maxWidth }}>
        <div className="bg-[#2D7D7B] rounded-l-full" style={{ width: addW }} />
        {dels > 0 && <div className="bg-[#E0845E] rounded-r-full" style={{ width: delW }} />}
      </div>
      <span className="text-[10px] text-[#6B6B7B] whitespace-nowrap">
        <span className="text-[#2D7D7B]">+{adds}</span>
        {dels > 0 && <span className="text-[#E0845E]"> -{dels}</span>}
      </span>
    </div>
  );
}

export default function GitCommitsCard() {
  return (
    <Card className="bg-white border border-[#E8E5DE] shadow-none rounded-xl">
      <CardHeader className="border-b border-[#E8E5DE] pb-3">
        <CardTitle className="flex items-center gap-2 text-[#1A1A1A] text-sm font-semibold">
          <GitCommit size={15} className="text-[#2D7D7B]" />
          최근 커밋
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-1 pb-1">
        {/* 타임라인 */}
        <div className="relative ml-3">
          {/* 세로 연결선 */}
          <div className="absolute left-0 top-4 bottom-4 w-px bg-[#E8E5DE]" />

          {COMMITS.map((c) => (
            <div key={c.id} className="relative flex gap-3 py-3 group">
              {/* 타임라인 노드 */}
              <div className="relative z-10 mt-1 size-2 shrink-0 rounded-full bg-[#2D7D7B] ring-2 ring-white group-hover:ring-[#F5F5EF]" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] rounded bg-[#F5F5EF] px-1.5 py-0.5 text-[#6B6B7B]">
                    {c.hash}
                  </span>
                  <span className="text-xs text-[#6B6B7B]">{c.time}</span>
                </div>
                <p className="mt-0.5 text-sm font-medium text-[#1A1A1A] truncate">
                  {c.msg}
                </p>
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-xs text-[#6B6B7B]">{c.author}</span>
                  <span className="text-[10px] text-[#6B6B7B]">{c.files}개 파일</span>
                  <ChangesBar adds={c.adds} dels={c.dels} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
