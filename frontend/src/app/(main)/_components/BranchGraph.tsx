// 브랜치 그래프 SVG 컴포넌트 — BranchStatusCard에서 분리

'use client';

import React from 'react';

// 브랜치 색상 매핑
export const BRANCH_COLORS = {
  main: '#16a34a',
  auth: '#2D7D7B',
  chat: '#E0845E',
  fix: '#9CA3AF',
} as const;

export type Lane = keyof typeof BRANCH_COLORS;

export interface GraphRow {
  id: string;
  hash: string;
  msg: string;
  author: string;
  time: string;
  lane: Lane;
  /** 이 커밋에서 분기되는 브랜치 */
  branchOut?: Lane;
  /** 이 커밋에서 병합되는 브랜치 */
  mergeIn?: Lane;
}

// 레인 위치 (x좌표)
const LANE_X: Record<Lane, number> = { main: 20, fix: 50, auth: 80, chat: 110 };
export const SVG_WIDTH = 130;
export const ROW_HEIGHT = 52;

/** 각 레인의 활성 구간에 세로선 렌더링 */
function renderLaneLines(graph: GraphRow[]) {
  const lanes: Lane[] = ['main', 'fix', 'auth', 'chat'];
  const elements: React.ReactNode[] = [];

  for (const lane of lanes) {
    const indices = graph
      .map((r, i) => (r.lane === lane || r.branchOut === lane || r.mergeIn === lane ? i : -1))
      .filter((i) => i >= 0);

    if (indices.length < 2) continue;

    const top = Math.min(...indices) * ROW_HEIGHT + ROW_HEIGHT / 2;
    const bottom = Math.max(...indices) * ROW_HEIGHT + ROW_HEIGHT / 2;
    const x = LANE_X[lane];

    elements.push(
      <line
        key={`lane-${lane}`}
        x1={x} y1={top} x2={x} y2={bottom}
        stroke={BRANCH_COLORS[lane]}
        strokeWidth={2}
        opacity={0.25}
      />
    );
  }

  return elements;
}

interface BranchGraphProps {
  graph: GraphRow[];
}

/** 브랜치 분기/병합을 시각화하는 SVG 그래프 */
export default function BranchGraph({ graph }: BranchGraphProps) {
  const svgHeight = graph.length * ROW_HEIGHT;

  return (
    <svg width={SVG_WIDTH} height={svgHeight} className="shrink-0">
      {/* 세로 레인 선 — 활성 구간만 */}
      {renderLaneLines(graph)}

      {/* 분기/병합 곡선 */}
      {graph.map((row, i) => {
        const y = i * ROW_HEIGHT + ROW_HEIGHT / 2;
        const elements: React.ReactNode[] = [];

        if (row.branchOut) {
          const fromX = LANE_X[row.lane];
          const toX = LANE_X[row.branchOut];
          elements.push(
            <path
              key={`bo-${row.id}`}
              d={`M ${fromX} ${y} C ${fromX} ${y - 20}, ${toX} ${y - 10}, ${toX} ${y - ROW_HEIGHT / 2}`}
              fill="none"
              stroke={BRANCH_COLORS[row.branchOut]}
              strokeWidth={2}
              opacity={0.6}
            />
          );
        }

        if (row.mergeIn) {
          const toX = LANE_X[row.lane];
          const fromX = LANE_X[row.mergeIn];
          elements.push(
            <path
              key={`mi-${row.id}`}
              d={`M ${fromX} ${y - ROW_HEIGHT / 2} C ${fromX} ${y - 10}, ${toX} ${y - 20}, ${toX} ${y}`}
              fill="none"
              stroke={BRANCH_COLORS[row.mergeIn]}
              strokeWidth={2}
              opacity={0.6}
              strokeDasharray="4 2"
            />
          );
        }

        return elements;
      })}

      {/* 커밋 노드 */}
      {graph.map((row, i) => {
        const x = LANE_X[row.lane];
        const y = i * ROW_HEIGHT + ROW_HEIGHT / 2;
        const color = BRANCH_COLORS[row.lane];
        const isMerge = !!row.mergeIn;

        return (
          <g key={row.id}>
            {/* 노드 외곽 링 */}
            <circle cx={x} cy={y} r={isMerge ? 7 : 5} fill="white" stroke={color} strokeWidth={2} />
            {/* 노드 내부 */}
            <circle cx={x} cy={y} r={isMerge ? 4 : 3} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}
