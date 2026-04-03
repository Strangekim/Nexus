// 도구 사용 카드 헬퍼 — 도구별 아이콘·라벨·요약 매핑

import {
  FileText,
  Pencil,
  FilePlus,
  Terminal,
  Search,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { ActiveToolUse } from '@/types/message';

interface ToolDisplayInfo {
  Icon: LucideIcon;
  label: string;
  /** 헤더에 표시할 인라인 요약 (파일 경로, 명령어 등) */
  inline?: string;
  /** 잘리지 않은 전체 텍스트 (title 속성용) */
  inlineFull?: string;
  /** 코드 스타일로 표시할지 여부 */
  isCode?: boolean;
}

/** worktree 경로에서 상대 경로를 추출한다 */
function shortenPath(rawPath: string): string {
  if (!rawPath) return rawPath;
  // /projects-wt/ 이후의 경로에서 프로젝트명/세션ID 부분을 건너뛴다
  const wtIdx = rawPath.indexOf('/projects-wt/');
  if (wtIdx !== -1) {
    const afterWt = rawPath.slice(wtIdx + '/projects-wt/'.length);
    const segments = afterWt.split('/');
    // projects-wt/{프로젝트명}/{세션ID}/이후경로 → 이후경로만 반환
    if (segments.length > 2) {
      return segments.slice(2).join('/');
    }
  }
  // 절대 경로의 마지막 2세그먼트만 표시
  const segments = rawPath.split('/').filter(Boolean);
  if (segments.length <= 2) return rawPath;
  return segments.slice(-2).join('/');
}

/** 도구 입력에서 파일 경로를 추출한다 */
function extractFilePath(toolUse: ActiveToolUse): string | undefined {
  const input = toolUse.input;
  if (!input) return toolUse.summary;
  const raw = (input.file_path ?? input.filePath ?? input.path) as string | undefined;
  return raw ? shortenPath(raw) : toolUse.summary;
}

/** 도구 입력에서 파일 경로 전체를 추출한다 (title용) */
function extractFullPath(toolUse: ActiveToolUse): string | undefined {
  const input = toolUse.input;
  if (!input) return toolUse.summary;
  return (input.file_path ?? input.filePath ?? input.path) as string | undefined;
}

/** 도구별 표시 정보를 반환한다 */
export function getToolDisplay(toolUse: ActiveToolUse): ToolDisplayInfo {
  const toolName = toolUse.tool?.toLowerCase() ?? '';
  const input = toolUse.input;

  switch (toolName) {
    case 'read': {
      const path = extractFilePath(toolUse);
      return {
        Icon: FileText,
        label: '파일 읽기',
        inline: path,
        inlineFull: extractFullPath(toolUse),
      };
    }
    case 'edit': {
      const path = extractFilePath(toolUse);
      return {
        Icon: Pencil,
        label: '파일 수정',
        inline: path,
        inlineFull: extractFullPath(toolUse),
      };
    }
    case 'write': {
      const path = extractFilePath(toolUse);
      return {
        Icon: FilePlus,
        label: '파일 작성',
        inline: path,
        inlineFull: extractFullPath(toolUse),
      };
    }
    case 'bash': {
      const cmd = (input?.command as string) ?? toolUse.summary;
      // 명령어가 길면 앞부분만 표시
      const short = cmd && cmd.length > 60 ? cmd.slice(0, 60) + '…' : cmd;
      return {
        Icon: Terminal,
        label: '명령 실행',
        inline: short,
        inlineFull: cmd,
        isCode: true,
      };
    }
    case 'glob': {
      const pattern = (input?.pattern as string) ?? toolUse.summary;
      return {
        Icon: Search,
        label: '파일 검색',
        inline: pattern,
        inlineFull: pattern,
        isCode: true,
      };
    }
    case 'grep': {
      const pattern = (input?.pattern as string) ?? toolUse.summary;
      return {
        Icon: Search,
        label: '내용 검색',
        inline: pattern,
        inlineFull: pattern,
        isCode: true,
      };
    }
    default:
      return {
        Icon: Wrench,
        label: toolUse.tool || '도구',
        inline: toolUse.summary,
        inlineFull: toolUse.summary,
      };
  }
}

/** 완료된 도구 결과를 한글 요약으로 변환한다 */
export function formatResultSummary(toolUse: ActiveToolUse): string {
  const meta = toolUse.resultMeta;

  // resultMeta가 있으면 활용
  if (meta) {
    if (meta.numFiles !== undefined) return `${meta.numFiles}개 파일`;
    if (meta.numLines !== undefined) return `${meta.numLines}줄`;
    if (meta.durationMs !== undefined) return `${meta.durationMs}ms`;
  }

  // resultMeta 없으면 도구별 기본 표시
  return '완료';
}
