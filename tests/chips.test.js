import test from 'node:test';
import assert from 'node:assert/strict';
import { chipNextIndex, chipFocusAfterRemove } from '../scripts/chips.js';

test('칩 묶음 화살표 이동 — 끝에서 멈추고, Home · End, RTL 반전', () => {
  assert.equal(chipNextIndex(0, 4, 'ArrowRight'), 1);
  assert.equal(chipNextIndex(3, 4, 'ArrowRight'), 3);
  assert.equal(chipNextIndex(0, 4, 'ArrowLeft'), 0);
  assert.equal(chipNextIndex(2, 4, 'Home'), 0);
  assert.equal(chipNextIndex(1, 4, 'End'), 3);
  assert.equal(chipNextIndex(1, 4, 'ArrowLeft', true), 2);
  assert.equal(chipNextIndex(0, 0, 'ArrowRight'), -1);
});

test('input 칩 제거 뒤 포커스 — 같은 자리(다음 칩), 마지막이면 이전 칩, 없으면 -1', () => {
  assert.equal(chipFocusAfterRemove(1, 3), 1);
  assert.equal(chipFocusAfterRemove(3, 3), 2);
  assert.equal(chipFocusAfterRemove(0, 0), -1);
});
