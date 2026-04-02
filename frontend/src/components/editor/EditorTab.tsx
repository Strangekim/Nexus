'use client';
// 편집기 탭 컴포넌트 — CLAUDE.md / skills.md 탭 버튼

interface EditorTabProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

/** 편집기 상단 탭 버튼 */
export function EditorTab({ label, active, onClick }: EditorTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
      style={{
        borderBottomColor: active ? '#2D7D7B' : 'transparent',
        color: active ? '#2D7D7B' : '#6B6B7B',
        background: 'transparent',
      }}
    >
      {label}
    </button>
  );
}
