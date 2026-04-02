// Diff 뷰어 — 파일별 unified diff 렌더링, 접기/펼치기 지원

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import type { FileDiff } from '@/types/commit';

interface DiffViewerProps {
  files: FileDiff[];
}

export function DiffViewer({ files }: DiffViewerProps) {
  return (
    <div className="space-y-3">
      {files.map((file, i) => (
        <FileDiffBlock key={i} file={file} />
      ))}
    </div>
  );
}

/** 파일별 Diff 블록 — 접기/펼치기 */
function FileDiffBlock({ file }: { file: FileDiff }) {
  const [expanded, setExpanded] = useState(true);
  const displayPath = file.newPath !== '/dev/null' ? file.newPath : file.oldPath;

  return (
    <div className="rounded-lg border border-[#E8E5DE] overflow-hidden">
      {/* 파일 헤더 */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[#F5F5EF] hover:bg-[#EEEDE7] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? (
            <ChevronDown size={14} className="shrink-0 text-[#6B6B7B]" />
          ) : (
            <ChevronRight size={14} className="shrink-0 text-[#6B6B7B]" />
          )}
          <FileText size={13} className="shrink-0 text-[#6B6B7B]" />
          <span className="font-mono text-xs text-[#1A1A1A] truncate">{displayPath}</span>
        </div>
        <div className="flex items-center gap-2 text-xs shrink-0 ml-2">
          <span className="text-[#16a34a] font-medium">+{file.additions}</span>
          <span className="text-[#dc2626] font-medium">-{file.deletions}</span>
        </div>
      </button>

      {/* Diff 본문 */}
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] font-mono border-collapse">
            <tbody>
              {file.lines.map((line, idx) => (
                <DiffLineRow key={idx} line={line} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Diff 한 줄 렌더링 */
function DiffLineRow({ line }: { line: { type: string; content: string; oldLineNo?: number; newLineNo?: number } }) {
  const bgClass =
    line.type === 'addition'
      ? 'bg-[#f0fdf4]'
      : line.type === 'deletion'
        ? 'bg-[#fef2f2]'
        : line.type === 'header'
          ? 'bg-[#EFF6FF]'
          : 'bg-white';

  const textClass =
    line.type === 'addition'
      ? 'text-[#16a34a]'
      : line.type === 'deletion'
        ? 'text-[#dc2626]'
        : line.type === 'header'
          ? 'text-[#2563EB]'
          : 'text-[#374151]';

  const prefix =
    line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' ';

  return (
    <tr className={`${bgClass} border-b border-[#F3F4F6]`}>
      {/* 줄 번호 영역 */}
      <td className="select-none text-right text-[#9CA3AF] px-2 py-0.5 border-r border-[#E8E5DE] w-10 min-w-[2.5rem]">
        {line.type === 'header' ? '' : (line.oldLineNo ?? '')}
      </td>
      <td className="select-none text-right text-[#9CA3AF] px-2 py-0.5 border-r border-[#E8E5DE] w-10 min-w-[2.5rem]">
        {line.type === 'header' ? '' : (line.newLineNo ?? '')}
      </td>
      {/* +/- 기호 */}
      <td className={`select-none text-center px-1 py-0.5 w-5 ${textClass}`}>
        {line.type === 'context' ? ' ' : prefix}
      </td>
      {/* 코드 내용 */}
      <td className={`px-3 py-0.5 whitespace-pre ${textClass}`}>
        {line.content}
      </td>
    </tr>
  );
}
