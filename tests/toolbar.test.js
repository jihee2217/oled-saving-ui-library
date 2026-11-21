import test from 'node:test';
import assert from 'node:assert/strict';
import { TOOLBAR, toolbarScroll, toolbarFabSize, toolbarNextIndex, toolbarDockedGap } from '../scripts/toolbar.js';

test('스크롤 반응 — 40 넘게 내려가면 숨고, 40 넘게 올라오면 보임, 맨 위는 늘 보임', () => {
  let s = { shown: true, acc: 0 };
  s = toolbarScroll(s, 30, 30); assert.equal(s.shown, true);
  s = toolbarScroll(s, 20, 50); assert.equal(s.shown, false);
  s = toolbarScroll(s, -30, 20); assert.equal(s.shown, false);
  s = toolbarScroll(s, 25, 45); assert.equal(s.shown, false);   // 방향이 바뀌면 다시 센다
  s = toolbarScroll(s, -45, 400); assert.equal(s.shown, true);
  assert.deepEqual(toolbarScroll({ shown: false, acc: 10 }, 5, 0), { shown: true, acc: 0 });
});

test('FAB 크기 · 화살표 이동', () => {
  assert.equal(toolbarFabSize(0), 56);
  assert.equal(toolbarFabSize(1), 80);
  assert.equal(toolbarFabSize(0.5), 68);
  assert.equal(toolbarNextIndex(0, 4, 'ArrowRight'), 1);
  assert.equal(toolbarNextIndex(3, 4, 'ArrowRight'), 3);
  assert.equal(toolbarNextIndex(1, 4, 'ArrowDown', { vertical: true }), 2);
  assert.equal(toolbarNextIndex(1, 4, 'ArrowRight', { vertical: true }), 1);
  assert.equal(toolbarNextIndex(2, 4, 'Home'), 0);
  assert.equal(toolbarNextIndex(0, 4, 'End'), 3);
});

test('docked 고르게 배치 — 사이 4 ~ 32', () => {
  assert.deepEqual(toolbarDockedGap(360, 240, 5), { gap: 22, overflow: false });
  assert.equal(toolbarDockedGap(1000, 240, 5).gap, TOOLBAR.dockedMaxGap);
  assert.deepEqual(toolbarDockedGap(250, 240, 5), { gap: 4, overflow: true });
});
