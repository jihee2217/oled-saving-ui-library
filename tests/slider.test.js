import test from 'node:test';
import assert from 'node:assert/strict';
import { SLIDER_SIZES, sliderSnap, sliderPos, sliderValueAt, sliderSegments, sliderStops, sliderKey, sliderNearest } from '../scripts/slider.js';

test('크기 표 — M3 Measurements', () => {
  assert.deepEqual(Object.values(SLIDER_SIZES).map(s => [s.track, s.handle, s.radius, s.icon]), [[16, 44, 8, 0], [24, 44, 8, 0], [40, 52, 12, 24], [56, 68, 16, 24], [96, 108, 28, 32]]);
});

test('단계 맞춤 · 위치 ↔ 값', () => {
  assert.equal(sliderSnap(43, { step: 10 }), 40);
  assert.equal(sliderSnap(0.30000000004, { min: 0, max: 1, step: 0.1 }), 0.3);
  assert.equal(sliderSnap(130), 100);
  assert.equal(sliderPos(0, 204), 2);
  assert.equal(sliderPos(1, 204), 202);
  assert.equal(sliderValueAt(102, 204), 50);
  assert.equal(sliderValueAt(-20, 204), 0);
});

test('트랙 조각 — 손잡이 양옆 간격 6 · 안쪽 모서리 2', () => {
  const s = sliderSegments({ length: 204, positions: [102], radius: 8 });
  assert.deepEqual(s.map(x => [x.from, x.to, x.active, x.r0, x.r1]), [[0, 94, true, 8, 2], [110, 204, false, 2, 8]]);
  const z = sliderSegments({ length: 204, positions: [2] });
  assert.deepEqual(z.map(x => x.active), [false], '0이면 활성 조각 없음');
  const c = sliderSegments({ length: 200, positions: [150], type: 'centered' });
  assert.deepEqual(c.map(x => [x.from, x.to, x.active]), [[0, 100, false], [100, 142, true], [158, 200, false]]);
  const r = sliderSegments({ length: 200, positions: [50, 150], type: 'range' });
  assert.deepEqual(r.map(x => x.active), [false, true, false]);
});

test('멈춤 점 — 끝 점 · 단계 점, 손잡이 근처는 뺀다', () => {
  assert.deepEqual(sliderStops({ length: 204, positions: [102] }), [{ pos: 196, active: false }]);
  assert.deepEqual(sliderStops({ length: 204, positions: [102], type: 'range' }).length, 2);
  const steps = sliderStops({ length: 204, positions: [102], count: 11 });
  assert.equal(steps.length, 10, '손잡이 위의 점 하나 빠짐');
  assert.equal(steps.filter(s => s.active).length, 5);
});

test('키보드 — 화살표 · Page · Home · End, RTL, 범위 한계', () => {
  assert.equal(sliderKey(40, 'ArrowRight'), 41);
  assert.equal(sliderKey(40, 'ArrowRight', { rtl: true }), 39);
  assert.equal(sliderKey(40, 'ArrowUp', { step: 10 }), 50);
  assert.equal(sliderKey(40, 'PageDown'), 30);
  assert.equal(sliderKey(40, 'Home'), 0);
  assert.equal(sliderKey(40, 'End', { hi: 70 }), 70);
  assert.equal(sliderKey(40, 'Tab'), null);
});

test('가까운 손잡이', () => {
  assert.equal(sliderNearest([50, 150], 60), 0);
  assert.equal(sliderNearest([50, 150], 140), 1);
  assert.equal(sliderNearest([100, 100], 120), 1, '겹치면 움직이는 쪽');
});
