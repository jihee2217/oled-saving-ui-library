import test from 'node:test';
import assert from 'node:assert/strict';
import { springStep, loadingFrame, loadingDeterminate, morphPath, linearDeterminate, linearStop, linearSegment, linearIndeterminate, linearIndeterminateParts, waveAmplitudeFor, circularDeterminate, circularIndeterminate, circularWaveCount, EASE } from '../scripts/progress.js';
import { LOADING_SHAPES } from '../scripts/loadingShapes.js';

const near = (a, b, eps = 1e-3) => Math.abs(a - b) < eps;

test('로딩 표시 스프링 — 0에서 시작해 1을 넘었다 돌아오고, 650ms 안에 끝난다', () => {
  assert.equal(springStep(0).value, 0);
  const peak = Math.max(...Array.from({ length: 60 }, (_, i) => springStep(i * 10).value));
  assert.ok(peak > 1, '감쇠 0.6이라 넘침이 있다');
  assert.ok(springStep(649).done, '모핑 간격 안에 끝남');
  assert.ok(!springStep(100).done);
});

test('로딩 표시 장면 — 모양 7개를 돌고, 끝난 뒤 다음 모양 · 목표 회전 +90, 회전은 이어진다', () => {
  assert.deepEqual([loadingFrame(0).index, loadingFrame(0).progress], [0, 0]);
  assert.equal(loadingFrame(640).index, 1, '스프링이 끝나면 다음 모양');
  assert.equal(loadingFrame(650 * 7 + 10).index, 0, '7개 뒤 처음으로');
  // 끝나는 순간 전후로 회전이 크게 튀지 않는다
  let prev = loadingFrame(0).rotation;
  for (let ms = 5; ms < 3000; ms += 5) {
    const r = loadingFrame(ms).rotation;
    const diff = Math.abs(((r - prev + 540) % 360) - 180);
    assert.ok(diff < 25, `${ms}ms에서 ${diff}° 튐`);
    prev = r;
  }
});

test('확정 로딩 표시 — 진행에 따라 반시계 180°', () => {
  assert.deepEqual(loadingDeterminate(0.5), { progress: 0.5, rotation: -90 });
  assert.equal(loadingDeterminate(2).progress, 1);
});

test('모핑 경로 — 데이터 7쌍 · 닫힌 경로 · 가운데 정렬', () => {
  assert.equal(LOADING_SHAPES.indeterminate.length, 7);
  LOADING_SHAPES.indeterminate.forEach(pairs => pairs.forEach(p => assert.equal(p.length, 16)));
  const d = morphPath(LOADING_SHAPES.indeterminate[0], 0, 48, 0.8);
  assert.match(d, /^M[\d.]+ [\d.]+C.*Z$/);
  const nums = d.replace(/[MCZ]/g, ' ').trim().split(/\s+/).map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
  assert.ok(near((Math.min(...xs) + Math.max(...xs)) / 2, 24, 0.02));
  assert.ok(near((Math.min(...ys) + Math.max(...ys)) / 2, 24, 0.02));
});

test('선형 확정 — 활성 · 간격 · 트랙, 처음에는 간격이 진행만큼만', () => {
  const w = 200, t = 4;
  assert.deepEqual(linearDeterminate(0, w, t), { active: null, track: [0, 1] });
  const half = linearDeterminate(0.5, w, t);
  assert.deepEqual(half.active, [0, 0.5]);
  assert.ok(near(half.track[0], 0.5 + 8 / 200), '간격 4 + 둥근 끝 4');
  const tiny = linearDeterminate(0.01, w, t);
  assert.ok(near(tiny.track[0], 0.02), '진행보다 큰 간격은 쓰지 않는다');
  assert.equal(linearDeterminate(1, w, t).track, null);
  assert.deepEqual(linearStop(200, 4), { cx: 198, r: 2 });
  assert.deepEqual(linearStop(200, 8), { cx: 196, r: 2 }, '두꺼우면 (8 − 4) / 2 = 2 안쪽');
  assert.deepEqual(linearSegment([0, 0.001], 200, 4), [2, 2], '작은 진행은 점');
});

test('선형 불확정 — 1750ms 주기, 두 줄, 트랙은 줄과 겹치지 않는다', () => {
  const start = linearIndeterminate(0);
  assert.deepEqual([start.first, start.second], [[0, 0], [0, 0]]);
  for (let ms = 0; ms < 1750; ms += 25) {
    const { active, track } = linearIndeterminateParts(ms, 240, 4);
    for (const [a0, a1] of active) for (const [t0, t1] of track) {
      assert.ok(t1 <= a0 + 1e-9 || t0 >= a1 - 1e-9, `${ms}ms 겹침`);
    }
  }
});

test('물결 진폭 — 10% 이하 · 95% 이상은 평평', () => {
  assert.deepEqual([0, 0.1, 0.11, 0.94, 0.95, 1].map(waveAmplitudeFor), [0, 0, 1, 1, 0, 0]);
});

test('원형 확정 · 불확정', () => {
  const c = circularDeterminate(0.25, 40, 4);
  assert.equal(c.start, -90);
  assert.equal(c.sweep, 90);
  assert.ok(near(c.trackStart - (c.start + c.sweep), (8 / (Math.PI * 40)) * 360));
  assert.ok(near(c.sweep + c.trackSweep + 2 * (c.trackStart - c.start - c.sweep), 360));
  assert.ok(near(circularIndeterminate(0).sweep, 36));
  assert.ok(near(circularIndeterminate(3000).sweep, 0.87 * 360));
  assert.ok(near(circularIndeterminate(300).rotation, (300 / 6000) * 1080 + 90));
  assert.equal(circularWaveCount(20.4), Math.round((2 * Math.PI * 20.4) / 15));
});

test('M3 이징 곡선', () => {
  assert.equal(EASE.standard(0), 0);
  assert.equal(EASE.standard(1), 1);
  assert.ok(EASE.emphasizedAccelerate(0.5) < 0.2, '가속형은 느리게 시작');
});
