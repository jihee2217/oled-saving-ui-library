/**
 * bwCube.js
 * Overview의 "여덟 색 사이의 색" 그림 — RGB 정육면체에서 한 색이 여덟 꼭짓점(실측 색)에 얼마나 가까운지 계산한다.
 * 가중치는 bwIndex.js의 3선형 보간과 같은 식이다: Σ(가중치 × 꼭짓점 값) = calcBwIndex.
 */
import { calcBwIndex } from './bwIndex.js';

// 꼭짓점 순서는 Overview의 여덟 색 막대(값이 낮은 순)와 같다. on = [R, G, B] 소자가 켜졌는지.
const CUBE_VERTEX_DEFS = [
  ['black', '검정', [0, 0, 0]],
  ['red', '빨강', [1, 0, 0]],
  ['green', '초록', [0, 1, 0]],
  ['yellow', '노랑', [1, 1, 0]],
  ['blue', '파랑', [0, 0, 1]],
  ['magenta', '자홍', [1, 0, 1]],
  ['cyan', '청록', [0, 1, 1]],
  ['white', '흰색', [1, 1, 1]],
];

export const CUBE_VERTICES = CUBE_VERTEX_DEFS.map(([key, name, on]) => ({
  key, name, on,
  value: calcBwIndex(on[0] * 255, on[1] * 255, on[2] * 255),
}));

/**
 * 색 하나가 여덟 꼭짓점에 가까운 정도(합 1). CUBE_VERTICES와 같은 순서.
 * @param {number} r 0~255
 * @param {number} g 0~255
 * @param {number} b 0~255
 * @returns {number[]}
 */
export function cubeWeights(r, g, b) {
  const n = [r, g, b].map(v => Math.min(255, Math.max(0, v)) / 255);
  return CUBE_VERTICES.map(({ on }) => on.reduce((w, lit, axis) => w * (lit ? n[axis] : 1 - n[axis]), 1));
}

/**
 * 정육면체 안의 점을 그림 좌표로 옮긴다(가로 R, 세로 G, 안쪽 B).
 * @param {number} r 0~1
 * @param {number} g 0~1
 * @param {number} b 0~1
 * @param {{ size: number, x: number, y: number }} box 앞면 한 변의 길이와 검정 꼭짓점의 위치
 * @returns {[number, number]}
 */
export function cubePoint(r, g, b, box) {
  return [box.x + (r + b * 0.45) * box.size, box.y - (g + b * 0.42) * box.size];
}
