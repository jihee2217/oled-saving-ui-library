import test from 'node:test';
import assert from 'node:assert/strict';
import { navCenteredPadding, navRailExpandedWidth, navNextIndex, navSelect, NAV_RAIL } from '../scripts/navigation.js';

test('가운데 정렬 바 여백 — Compose 공식(한쪽 20 · 15 · 10 %)', () => {
  assert.equal(navCenteredPadding(3, 800), 160);
  assert.equal(navCenteredPadding(4, 800), 120);
  assert.equal(navCenteredPadding(5, 800), 80);
  assert.equal(navCenteredPadding(6, 800), 40);
  assert.equal(navCenteredPadding(7, 800), 0);
});

test('펼친 레일 폭 — 내용 + 20을 220 ~ 360으로', () => {
  assert.equal(NAV_RAIL.collapsed, 96);
  assert.equal(navRailExpandedWidth(120), 220);
  assert.equal(navRailExpandedWidth(250), 270);
  assert.equal(navRailExpandedWidth(500), 360);
});

test('레일 화살표 이동 — 끝에서 멈춤, Home · End', () => {
  assert.equal(navNextIndex(0, 4, 'ArrowDown'), 1);
  assert.equal(navNextIndex(3, 4, 'ArrowDown'), 3);
  assert.equal(navNextIndex(0, 4, 'ArrowUp'), 0);
  assert.equal(navNextIndex(2, 4, 'Home'), 0);
  assert.equal(navNextIndex(1, 4, 'End'), 3);
  assert.equal(navNextIndex(1, 4, 'ArrowLeft'), 1);
  assert.equal(navNextIndex(0, 0, 'ArrowDown'), -1);
});

test('목적지 고르기 — 다른 항목은 이동, 같은 항목은 다시 고름', () => {
  assert.deepEqual(navSelect(0, 2, 4), { active: 2, action: 'navigate' });
  assert.deepEqual(navSelect(2, 2, 4), { active: 2, action: 'reselect' });
  assert.deepEqual(navSelect(1, 5, 4), { active: 1, action: 'none' });
});
