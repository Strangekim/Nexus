// 활동 피드 카드 컴포넌트 — 최근 팀 활동 목록 표시

import { Activity, GitCommit, MessageSquare, Plus } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

// 활동 유형별 아이콘 및 색상 매핑
const ACTIVITY_TYPE_MAP = {
  commit: { icon: GitCommit, color: "#2D7D7B", bg: "#2D7D7B1A" },
  message: { icon: MessageSquare, color: "#E0845E", bg: "#E0845E1A" },
  create: { icon: Plus, color: "#2D7D7B", bg: "#2D7D7B1A" },
} as const;

type ActivityType = keyof typeof ACTIVITY_TYPE_MAP;

// 활동 피드 목데이터
const ACTIVITY_FEED: {
  id: string;
  user: string;
  action: string;
  project: string;
  type: ActivityType;
  time: string;
}[] = [
  {
    id: "a1",
    user: "김민준",
    action: "결제 플로우 개선 세션에 커밋",
    project: "쇼핑몰 리뉴얼",
    type: "commit",
    time: "12분 전",
  },
  {
    id: "a2",
    user: "이서연",
    action: "로그인 버그 수정 세션에서 메시지 전송",
    project: "사내 인트라넷",
    type: "message",
    time: "47분 전",
  },
  {
    id: "a3",
    user: "박지호",
    action: "새 세션 생성: 대시보드 차트 연동",
    project: "사내 인트라넷",
    type: "create",
    time: "2시간 전",
  },
  {
    id: "a4",
    user: "김민준",
    action: "상품 리스트 UI 개선 세션에 커밋",
    project: "쇼핑몰 리뉴얼",
    type: "commit",
    time: "3시간 전",
  },
];

// 사용자 이름 이니셜 추출
function getInitials(name: string): string {
  return name.slice(0, 1);
}

export default function ActivityFeedCard() {
  return (
    <Card className="bg-white border border-[#E8E5DE] shadow-none rounded-xl">
      <CardHeader className="border-b border-[#E8E5DE] pb-3">
        <CardTitle className="flex items-center gap-2 text-[#1A1A1A] text-sm font-semibold">
          <Activity size={15} className="text-[#2D7D7B]" />
          최근 활동
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 pb-1">
        <ul className="divide-y divide-[#E8E5DE]">
          {ACTIVITY_FEED.map((item) => {
            const { icon: Icon, color, bg } = ACTIVITY_TYPE_MAP[item.type];
            return (
              <li key={item.id} className="flex items-start gap-3 py-3">
                {/* 사용자 아바타 */}
                <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#2D7D7B] to-[#E0845E] flex items-center justify-center text-white text-xs font-semibold">
                  {getInitials(item.user)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1A1A1A] leading-snug">
                    <span className="font-semibold">{item.user}</span>
                    {"이(가) "}
                    <span className="text-[#6B6B7B]">{item.action}</span>
                  </p>
                  {/* 프로젝트명 + 활동 유형 배지 */}
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium"
                      style={{ color, backgroundColor: bg }}
                    >
                      <Icon size={10} />
                      {item.project}
                    </div>
                    <span className="text-xs text-[#6B6B7B]">{item.time}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
