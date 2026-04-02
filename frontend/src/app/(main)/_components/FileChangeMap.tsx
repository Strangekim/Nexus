// 파일 변경 빈도 히트맵 — fileChanges API 연동, 순수 CSS
'use client';

import { FileCode, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useFileChanges } from '@/hooks/useDashboard';

interface Props {
  projectId: string;
}

/** 변경 빈도에 따른 teal 계열 색상 반환 */
function heatColor(count: number, max: number): string {
  const ratio = max > 0 ? count / max : 0;
  // teal 계열: #E8F5F5 (낮음) → #2D7D7B (높음)
  const r = Math.round(46 + (232 - 46) * (1 - ratio));
  const g = Math.round(125 + (245 - 125) * (1 - ratio));
  const b = Math.round(123 + (245 - 123) * (1 - ratio));
  return `rgb(${r},${g},${b})`;
}

/** 파일 경로에서 표시용 짧은 이름 추출 */
function shortPath(file: string): string {
  const parts = file.split('/');
  if (parts.length <= 2) return file;
  return `…/${parts.slice(-2).join('/')}`;
}

export default function FileChangeMap({ projectId }: Props) {
  const { data, isLoading, isError } = useFileChanges(projectId);
  const files = data?.fileChanges ?? [];
  const max = files[0]?.count ?? 1; // 이미 내림차순 정렬됨

  return (
    <Card className="bg-white border border-[#E8E5DE] shadow-none rounded-xl">
      <CardHeader className="border-b border-[#E8E5DE] pb-3">
        <CardTitle className="flex items-center gap-2 text-[#1A1A1A] text-sm font-semibold">
          <FileCode size={15} className="text-[#2D7D7B]" />
          파일 변경 빈도
          {isLoading && <RefreshCw size={12} className="text-[#6B6B7B] animate-spin ml-auto" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3 pb-2">
        {isError && (
          <p className="text-xs text-[#6B6B7B] text-center py-4">데이터를 불러올 수 없습니다.</p>
        )}
        {!isLoading && !isError && files.length === 0 && (
          <p className="text-xs text-[#6B6B7B] text-center py-6">커밋 데이터가 없습니다.</p>
        )}
        {files.length > 0 && (
          <>
            {/* 범례 */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] text-[#6B6B7B]">낮음</span>
              <div className="flex gap-0.5">
                {[0.1, 0.3, 0.5, 0.7, 0.9].map((r) => (
                  <div
                    key={r}
                    className="w-4 h-3 rounded-sm"
                    style={{ backgroundColor: heatColor(r * max, max) }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-[#6B6B7B]">높음</span>
            </div>
            {/* 히트맵 셀 목록 */}
            <div className="flex flex-wrap gap-1.5">
              {files.slice(0, 40).map(({ file, count }) => (
                <div
                  key={file}
                  className="relative group px-2 py-1 rounded text-[10px] font-mono truncate max-w-[160px] cursor-default transition-opacity hover:opacity-80"
                  style={{ backgroundColor: heatColor(count, max), color: count / max > 0.5 ? '#fff' : '#1A1A1A' }}
                  title={`${file} (${count}회)`}
                >
                  {shortPath(file)}
                  {/* 툴팁 */}
                  <span className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-[#1A1A1A] text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap z-10 font-sans">
                    {file} ({count}회)
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
