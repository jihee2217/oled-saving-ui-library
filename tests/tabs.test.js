import test from 'node:test';
import assert from 'node:assert/strict';
import { tabsNextIndex, tabsIndicator, tabsScrollTo } from '../scripts/tabs.js';

test('화살표 이동 — 감쌈 · Home · End · RTL · 비활성 건너뜀', () => {
  assert.equal(tabsNextIndex(0, 3, 'ArrowRight'), 1);
  assert.equal(tabsNextIndex(2, 3, 'ArrowRight'), 0);
  assert.equal(tabsNextIndex(0, 3, 'ArrowLeft'), 2);
  assert.equal(tabsNextIndex(0, 3, 'ArrowRight', { rtl: true }), 2);
  assert.equal(tabsNextIndex(1, 4, 'End'), 3);
  assert.equal(tabsNextIndex(3, 4, 'Home'), 0);
  assert.equal(tabsNextIndex(0, 4, 'ArrowRight', { disabled: [1] }), 2);
  assert.equal(tabsNextIndex(1, 3, 'ArrowDown'), 1);
});

test('표시기 — primary는 내용 폭(최소 24), secondary는 칸 폭', () => {
  assert.deepEqual(tabsIndicator('primary', { left: 0, width: 120 }, { left: 30, width: 60 }), { left: 30, width: 60 });
  assert.deepEqual(tabsIndicator('primary', { left: 0, width: 120 }, { left: 50, width: 20 }), { left: 48, width: 24 });
  assert.deepEqual(tabsIndicator('secondary', { left: 120, width: 120 }, { left: 150, width: 60 }), { left: 120, width: 120 });
});

test('스크롤형 — 선택 칸을 가운데로, 경계 안', () => {
  assert.equal(tabsScrollTo({ left: 600, width: 100 }, 360, 1200), 470);
  assert.equal(tabsScrollTo({ left: 20, width: 100 }, 360, 1200), 0);
  assert.equal(tabsScrollTo({ left: 1150, width: 100 }, 360, 1200), 840);
});

import { containerTextAnchors, compositeOver } from '../scripts/m3Palette.js';
test('글자 기준 배경 묶음 — 탭 누름(primary 10%) 자리 포함(명세 4.4.4)', () => {
  const bg = { h: 0, s: 0, l: 98 }, surface = { h: 0, s: 0, l: 94 }, secondary = { h: 10, s: 20, l: 40 };
  const primary = { h: 140, s: 80, l: 35 };
  const without = containerTextAnchors(bg, surface, 'light', secondary, {});
  const withP = containerTextAnchors(bg, surface, 'light', secondary, { primary });
  assert.equal(withP.length, without.length + 1);
  assert.deepEqual(withP[withP.length - 1], compositeOver(bg, primary, 0.10));
});
