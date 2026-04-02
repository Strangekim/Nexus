// 프로젝트 요약 카드 컴포넌트 — 전체 통계 숫자 표시

import { FolderKanban, MonitorPlay, Users } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

// 프로젝트 요약 목데이터
const SUMMARY_STATS = [
  {
    id: "projects",
    label: "전체 프로젝트",
    value: 2,
    icon: FolderKanban,
    color: "#2D7D7B",
    bg: "#2D7D7B1A",
  },
  {
    id: "sessions",
    label: "활성 세션",
    value: 4,
    icon: MonitorPlay,
    color: "#E0845E",
    bg: "#E0845E1A",
  },
  {
    id: "members",
    label: "팀원",
    value: 3,
    icon: Users,
    color: "#2D7D7B",
    bg: "#2D7D7B1A",
  },
];

export default function ProjectSummaryCard() {
  return (
    <Card className="bg-white border border-[#E8E5DE] shadow-none rounded-xl">
      <CardHeader className="border-b border-[#E8E5DE] pb-3">
        <CardTitle className="flex items-center gap-2 text-[#1A1A1A] text-sm font-semibold">
          <FolderKanban size={15} className="text-[#2D7D7B]" />
          프로젝트 요약
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 pb-2">
        <div className="grid grid-cols-3 gap-3">
          {SUMMARY_STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.id}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-[#F5F5EF]"
              >
                {/* 아이콘 배지 */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: stat.bg }}
                >
                  <Icon size={16} style={{ color: stat.color }} />
                </div>
                {/* 숫자 */}
                <span
                  className="text-2xl font-bold"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </span>
                {/* 레이블 */}
                <span className="text-xs text-[#6B6B7B] text-center leading-tight">
                  {stat.label}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
