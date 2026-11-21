import test from 'node:test';
import assert from 'node:assert/strict';
import { snackbarDuration, snackbarEnqueue, snackbarNext, snackbarLayout } from '../scripts/snackbar.js';

test('표시 시간 — 짧게 4초 · 길게 10초 · 동작 있으면 닫을 때까지', () => {
  assert.equal(snackbarDuration(), 4000);
  assert.equal(snackbarDuration({ length: 'long' }), 10000);
  assert.equal(snackbarDuration({ action: true }), Infinity);
  assert.equal(snackbarDuration({ length: 'indefinite' }), Infinity);
});

test('대기열 — 한 번에 하나, 같은 글은 한 번만', () => {
  let q = snackbarEnqueue([], { text: '저장함' });
  q = snackbarEnqueue(q, { text: '삭제함', action: '되돌리기' });
  q = snackbarEnqueue(q, { text: '저장함' });
  assert.equal(q.length, 2);
  const { current, queue } = snackbarNext(q);
  assert.equal(current.text, '저장함');
  assert.equal(queue.length, 1);
  assert.deepEqual(snackbarNext([]), { current: null, queue: [] });
});

test('줄 수 · 긴 동작', () => {
  assert.deepEqual(snackbarLayout({ textWidth: 200, available: 500, actionWidth: 80 }), { lines: 1, longAction: false });
  assert.deepEqual(snackbarLayout({ textWidth: 450, available: 500, actionWidth: 80 }), { lines: 2, longAction: false });
  assert.deepEqual(snackbarLayout({ textWidth: 200, available: 500, actionWidth: 300 }), { lines: 1, longAction: true });
});

import { derivePaletteRoles, compositeOver } from '../scripts/m3Palette.js';
import { PRESETS } from '../scripts/presets.js';
import { hslToRgb } from '../scripts/colorModel.js';
import { contrastBetween } from '../scripts/contrast.js';

test('inverse-primary — 상태 레이어(10%)가 깔린 동작 버튼 자리에서도 글자 기준(명세 4.7.2)', () => {
  const ratio = (a, b) => contrastBetween(hslToRgb(a.h, a.s, a.l), hslToRgb(b.h, b.s, b.l));
  for (const key of Object.keys(PRESETS)) {
    for (const target of [4.5, 7]) {
      const { roles } = derivePaletteRoles(PRESETS[key].tokens, key, target);
      const on = roles['inverse-primary'];
      const bg = roles['inverse-surface'];
      assert.ok(ratio(on, bg) >= target - 0.02, `${key} ${target} 기본`);
      assert.ok(ratio(on, compositeOver(bg, on, 0.10)) >= target - 0.05, `${key} ${target} 누름`);
    }
  }
});
