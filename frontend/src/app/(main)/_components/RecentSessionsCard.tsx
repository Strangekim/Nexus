// 최근 세션 카드 컴포넌트 — 최근 작업한 세션 목록 표시

import { Clock, FolderOpen } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

// 최근 세션 목데이터
const RECENT_SESSIONS = [
  {
    id: "s1",
    projectName: "쇼핑몰 리뉴얼",
    sessionName: "결제 플로우 개선",
    lastActivity: "12분 전",
  },
  {
    id: "s2",
    projectName: "사내 인트라넷",
    sessionName: "로그인 페이지 버그 수정",
    lastActivity: "1시간 전",
  },
  {
    id: "s3",
    projectName: "쇼핑몰 리뉴얼",
    sessionName: "상품 리스트 UI 개선",
    lastActivity: "3시간 전",
  },
  {
    id: "s4",
    projectName: "사내 인트라넷",
    sessionName: "대시보드 차트 연동",
    lastActivity: "어제",
  },
];

export default function RecentSessionsCard() {
  return (
    <Card className="bg-white border border-[#E8E5DE] shadow-none rounded-xl">
      <CardHeader className="border-b border-[#E8E5DE] pb-3">
        <CardTitle className="flex items-center gap-2 text-[#1A1A1A] text-sm font-semibold">
          <Clock size={15} className="text-[#2D7D7B]" />
          최근 세션
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 pb-1">
        <ul className="divide-y divide-[#E8E5DE]">
          {RECENT_SESSIONS.map((session) => (
            <li
              key={session.id}
              className="flex items-center justify-between py-3 hover:bg-[#F5F5EF] -mx-4 px-4 rounded-lg cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* 프로젝트 폴더 아이콘 */}
                <div className="shrink-0 w-7 h-7 rounded-md bg-[#2D7D7B]/10 flex items-center justify-center">
                  <FolderOpen size={13} className="text-[#2D7D7B]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#6B6B7B] truncate">
                    {session.projectName}
                  </p>
                  <p className="text-sm font-medium text-[#1A1A1A] truncate">
                    {session.sessionName}
                  </p>
                </div>
              </div>
              {/* 마지막 활동 시간 */}
              <span className="shrink-0 text-xs text-[#6B6B7B] ml-4">
                {session.lastActivity}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
