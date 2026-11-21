import test from 'node:test';
import assert from 'node:assert/strict';
import { fabMenuStagger } from '../scripts/fabMenu.js';

test('항목 순서 지연 — 열 때 아래(FAB 쪽)부터, 닫을 때 위부터', () => {
  assert.deepEqual([0, 1, 2].map(i => fabMenuStagger(i, 3)), [218, 109, 0]);
  assert.deepEqual([0, 1, 2].map(i => fabMenuStagger(i, 3, { opening: false })), [0, 109, 218]);
  assert.equal(fabMenuStagger(0, 1), 0);
});
