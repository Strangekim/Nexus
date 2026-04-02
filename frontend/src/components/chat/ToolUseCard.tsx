'use client';
// 도구 사용 카드 — 접기 가능한 도구 입력/출력 표시

import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronRight, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import type { ActiveToolUse } from '@/types/message';

interface ToolUseCardProps {
  toolUse: ActiveToolUse;
}

export function ToolUseCard({ toolUse }: ToolUseCardProps) {
  const [open, setOpen] = useState(false);
  const isRunning = toolUse.status === 'running';

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className="my-2 rounded-lg overflow-hidden border text-sm"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#E8E5DE' }}
      >
        {/* 헤더 */}
        <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 cursor-pointer hover:opacity-80">
          <ChevronRight
            size={14}
            className="transition-transform"
            style={{
              color: '#6B6B7B',
              transform: open ? 'rotate(90deg)' : undefined,
            }}
          />
          {/* 상태 아이콘 */}
          {isRunning ? (
            <Loader2 size={14} className="animate-spin" style={{ color: '#2D7D7B' }} />
          ) : toolUse.isError ? (
            <XCircle size={14} style={{ color: '#E0845E' }} />
          ) : (
            <CheckCircle2 size={14} style={{ color: '#2D7D7B' }} />
          )}
          <span style={{ color: '#3D3D3D' }}>{toolUse.tool}</span>
          {isRunning && (
            <span className="text-xs" style={{ color: '#6B6B7B' }}>
              실행 중...
            </span>
          )}
        </CollapsibleTrigger>

        {/* 접기 내용 */}
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            {/* 입력 */}
            {toolUse.input && (
              <div>
                <p className="text-xs mb-1" style={{ color: '#6B6B7B' }}>입력</p>
                <pre
                  className="p-2 rounded text-xs overflow-x-auto"
                  style={{ backgroundColor: '#0D1117', color: '#3D3D3D' }}
                >
                  {JSON.stringify(toolUse.input, null, 2)}
                </pre>
              </div>
            )}
            {/* 출력 */}
            {toolUse.output && (
              <div>
                <p className="text-xs mb-1" style={{ color: '#6B6B7B' }}>출력</p>
                <pre
                  className="p-2 rounded text-xs overflow-x-auto max-h-48"
                  style={{ backgroundColor: '#0D1117', color: '#3D3D3D' }}
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
