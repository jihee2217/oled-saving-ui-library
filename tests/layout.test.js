import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutBreakpoint, layoutSpec, layoutScale } from '../scripts/layout.js';

test('breakpoint 경계 — 600 · 840 · 1200 · 1600(androidx WindowSizeClass)', () => {
  assert.deepEqual([0, 599, 600, 839, 840, 1199, 1200, 1599, 1600, 2400].map(layoutBreakpoint),
    ['compact', 'compact', 'medium', 'medium', 'expanded', 'expanded', 'large', 'large', 'extra-large', 'extra-large']);
});

test('여백 · 간격 · 고정 창 · 내비게이션', () => {
  assert.deepEqual([412, 700, 1000, 1280, 1680].map(w => layoutSpec(w).margin), [16, 24, 24, 24, 24]);
  assert.deepEqual([412, 1000, 1280].map(w => layoutSpec(w).fixedPane), [360, 360, 412]);
  assert.deepEqual([412, 700, 1000, 1280, 1680].map(w => layoutSpec(w).nav), ['bar', 'rail', 'rail', 'rail', 'rail-expanded']);
  assert.equal(layoutSpec(1000).spacer, 24);
});

test('대표 레이아웃 — 창 수 · 배치 · 열', () => {
  assert.deepEqual([412, 700, 1000].map(w => layoutSpec(w, 'list-detail').panes), [1, 1, 2]);
  assert.deepEqual([412, 700, 1000].map(w => layoutSpec(w, 'supporting').arrange), ['stack', 'stack', 'side']);
  assert.deepEqual([412, 700, 1000, 1280, 1680].map(w => layoutSpec(w, 'feed').columns), [1, 2, 3, 3, 4]);
});

test('축소 비율은 1을 넘지 않는다', () => {
  assert.equal(layoutScale(412, 900), 1);
  assert.equal(layoutScale(1680, 840), 0.5);
  assert.equal(layoutScale(0, 500), 1);
});
