'use client';
// 파일 탐색기 — 디렉토리 트리 브라우징 + 파일 클릭으로 Monaco 에디터 열기

import { useState, useEffect } from 'react';
import { Folder, FolderOpen, File, ChevronRight, ChevronDown, Home } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
}

interface BrowseResponse {
  path: string;
  items: FileItem[];
}

interface FileBrowserProps {
  projectId: string;
  onFileSelect: (path: string) => void;
}

/** 디렉토리 항목 — 클릭 시 확장/축소 */
function DirectoryEntry({
  item,
  depth,
  projectId,
  onFileSelect,
}: {
  item: FileItem;
  depth: number;
  projectId: string;
  onFileSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<FileItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setExpanded((prev) => !prev);
    if (!items && !loading) {
      setLoading(true);
      try {
        const data = await apiFetch<BrowseResponse>(
          `/api/tree/browse?path=${encodeURIComponent(item.path)}&projectId=${projectId}`,
        );
        setItems(data.items);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-1 w-full py-0.5 hover:bg-white/5 text-left"
        style={{ paddingLeft: `${depth * 12 + 4}px`, color: '#D4D4D4' }}
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {expanded ? (
          <FolderOpen size={13} style={{ color: '#DCB67A' }} />
        ) : (
          <Folder size={13} style={{ color: '#DCB67A' }} />
        )}
        <span className="text-xs truncate">{item.name}</span>
      </button>
      {expanded && items && (
        <>
          {items.map((child) => {
            if (child.type === 'directory') {
              return (
                <DirectoryEntry
                  key={child.path}
                  item={child}
                  depth={depth + 1}
                  projectId={projectId}
                  onFileSelect={onFileSelect}
                />
              );
            }
            return (
              <FileEntry
                key={child.path}
                item={child}
                depth={depth + 1}
                onClick={() => onFileSelect(child.path)}
              />
            );
          })}
          {items.length === 0 && (
            <div
              style={{ paddingLeft: `${(depth + 1) * 12 + 4}px`, color: '#6B7280' }}
              className="text-xs py-0.5"
            >
              (비어있음)
            </div>
          )}
        </>
      )}
      {expanded && loading && !items && (
        <div
          style={{ paddingLeft: `${(depth + 1) * 12 + 4}px`, color: '#6B7280' }}
          className="text-xs py-0.5"
        >
          로딩...
        </div>
      )}
    </>
  );
}

/** 파일 항목 — 클릭 시 에디터 열기 */
function FileEntry({
  item,
  depth,
  onClick,
}: {
  item: FileItem;
  depth: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 w-full py-0.5 hover:bg-white/5 text-left"
      style={{ paddingLeft: `${depth * 12 + 20}px`, color: '#D4D4D4' }}
    >
      <File size={12} style={{ color: '#9CA3AF' }} />
      <span className="text-xs truncate">{item.name}</span>
    </button>
  );
}

export function FileBrowser({ projectId, onFileSelect }: FileBrowserProps) {
  const [rootItems, setRootItems] = useState<FileItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  // 루트 디렉토리 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiFetch<BrowseResponse>(
          `/api/tree/browse?projectId=${projectId}`,
        );
        if (!cancelled) setRootItems(data.items);
      } catch {
        if (!cancelled) setRootItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ backgroundColor: '#252526', borderRight: '1px solid #333' }}
    >
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 shrink-0"
        style={{ borderBottom: '1px solid #333' }}
      >
        <Home size={12} style={{ color: '#9CA3AF' }} />
        <span className="text-xs font-medium" style={{ color: '#D4D4D4' }}>탐색기</span>
      </div>
      <div className="flex-1 overflow-auto py-1">
        {loading && (
          <div className="px-2 py-1 text-xs" style={{ color: '#6B7280' }}>로딩 중...</div>
        )}
        {!loading && rootItems && (
          <>
            {rootItems.map((item) => {
              if (item.type === 'directory') {
                return (
                  <DirectoryEntry
                    key={item.path}
                    item={item}
                    depth={0}
                    projectId={projectId}
                    onFileSelect={onFileSelect}
                  />
                );
              }
              return (
                <FileEntry
                  key={item.path}
                  item={item}
                  depth={0}
                  onClick={() => onFileSelect(item.path)}
                />
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
