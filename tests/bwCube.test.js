import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcBwIndex } from '../scripts/bwIndex.js';
import { CUBE_VERTICES, cubeWeights, cubePoint } from '../scripts/bwCube.js';

test('꼭짓점 여덟 개의 값은 실측 기준값과 같다', () => {
  assert.deepEqual(CUBE_VERTICES.map(v => [v.key, Number(v.value.toFixed(2))]), [
    ['black', 0], ['red', 0.05], ['green', 0.25], ['yellow', 0.47],
    ['blue', 0.49], ['magenta', 0.72], ['cyan', 0.85], ['white', 1],
  ]);
});

test('가중치의 합은 1이고, 가중치 × 꼭짓점 값의 합은 calcBwIndex와 같다', () => {
  for (const [r, g, b] of [[152, 39, 22], [225, 131, 112], [128, 128, 128], [0, 0, 0], [255, 255, 255], [10, 200, 90]]) {
    const w = cubeWeights(r, g, b);
    assert.ok(Math.abs(w.reduce((a, x) => a + x, 0) - 1) < 1e-12);
    const mixed = w.reduce((a, x, i) => a + x * CUBE_VERTICES[i].value, 0);
    assert.ok(Math.abs(mixed - calcBwIndex(r, g, b)) < 1e-12);
  }
});

test('꼭짓점의 색은 그 꼭짓점만 반영한다', () => {
  CUBE_VERTICES.forEach(({ on }, i) => {
    const w = cubeWeights(on[0] * 255, on[1] * 255, on[2] * 255);
    w.forEach((x, j) => assert.equal(x, i === j ? 1 : 0));
  });
});

test('범위를 벗어난 값은 0~255로 자른다', () => {
  assert.deepEqual(cubeWeights(-20, 300, 0), cubeWeights(0, 255, 0));
});

test('그림 좌표: 검정은 기준점, R은 오른쪽, G는 위쪽, B는 오른쪽 위 안쪽', () => {
  const box = { size: 100, x: 10, y: 200 };
  assert.deepEqual(cubePoint(0, 0, 0, box), [10, 200]);
  assert.deepEqual(cubePoint(1, 0, 0, box), [110, 200]);
  assert.deepEqual(cubePoint(0, 1, 0, box), [10, 100]);
  const [x, y] = cubePoint(0, 0, 1, box);
  assert.ok(x > 10 && y < 200);
});
