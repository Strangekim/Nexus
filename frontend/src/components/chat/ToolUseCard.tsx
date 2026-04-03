'use client';
// 도구 사용 카드 — 도구별 아이콘·요약·결과 메타를 한 줄로 표시, 접기로 상세 확인

import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  FileText,
  Pencil,
  FilePlus,
  Terminal,
  Search,
  Wrench,
} from 'lucide-react';
import type { ActiveToolUse } from '@/types/message';
import { getToolDisplay, formatResultSummary } from './toolUseHelpers';

interface ToolUseCardProps {
  toolUse: ActiveToolUse;
}

export function ToolUseCard({ toolUse }: ToolUseCardProps) {
  const [open, setOpen] = useState(false);
  const isRunning = toolUse.status === 'running';
  const display = getToolDisplay(toolUse);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className="my-1.5 rounded-lg overflow-hidden border text-sm"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E5DE' }}
      >
        {/* 헤더: 아이콘 + 라벨 + 요약 + 결과 */}
        <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 cursor-pointer hover:opacity-80">
          <ChevronRight
            size={14}
            className="shrink-0 transition-transform"
            style={{
              color: '#6B6B7B',
              transform: open ? 'rotate(90deg)' : undefined,
            }}
          />
          {/* 도구 아이콘 */}
          <display.Icon
            size={14}
            className="shrink-0"
            style={{ color: isRunning ? '#2D7D7B' : toolUse.isError ? '#E0845E' : '#2D7D7B' }}
          />
          {/* 도구 라벨 */}
          <span className="shrink-0 font-medium" style={{ color: '#3D3D3D' }}>
            {display.label}
          </span>
          {/* 인라인 요약 (파일 경로, 명령어 등) */}
          {display.inline && (
            <span
              className={`truncate text-xs ${display.isCode ? 'font-mono px-1 py-0.5 rounded' : ''}`}
              style={{
                color: '#6B6B7B',
                ...(display.isCode ? { backgroundColor: '#F3F3F0' } : {}),
              }}
              title={display.inlineFull}
            >
              {display.inline}
            </span>
          )}
          {/* 스페이서 */}
          <span className="flex-1" />
          {/* 상태 표시 */}
          {isRunning ? (
            <Loader2 size={14} className="shrink-0 animate-spin" style={{ color: '#2D7D7B' }} />
          ) : toolUse.isError ? (
            <span className="flex items-center gap-1 shrink-0">
              <XCircle size={14} style={{ color: '#E0845E' }} />
              <span className="text-xs" style={{ color: '#E0845E' }}>오류</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 shrink-0">
              <CheckCircle2 size={14} style={{ color: '#2D7D7B' }} />
              <span className="text-xs" style={{ color: '#6B6B7B' }}>
                {formatResultSummary(toolUse)}
              </span>
            </span>
          )}
        </CollapsibleTrigger>

        {/* 접기 내용: 입력·출력 JSON */}
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            {toolUse.input && (
              <div>
                <p className="text-xs mb-1" style={{ color: '#6B6B7B' }}>입력</p>
                <pre
                  className="p-2 rounded text-xs overflow-x-auto"
                  style={{ backgroundColor: '#F3F3F0', color: '#3D3D3D' }}
                >
                  {JSON.stringify(toolUse.input, null, 2)}
                </pre>
              </div>
            )}
            {toolUse.output && (
              <div>
                <p className="text-xs mb-1" style={{ color: '#6B6B7B' }}>출력</p>
                <pre
                  className="p-2 rounded text-xs overflow-x-auto max-h-48"
                  style={{ backgroundColor: '#F3F3F0', color: '#3D3D3D' }}
                >
                  {toolUse.output}
                </pre>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
