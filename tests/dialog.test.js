import test from 'node:test';
import assert from 'node:assert/strict';
import { dialogTabTarget, dialogHasChanges } from '../scripts/dialog.js';

test('대화상자 Tab 순환 — 끝에서 처음으로, 처음에서 Shift+Tab이면 끝으로', () => {
  assert.equal(dialogTabTarget(2, 3, false), 0);
  assert.equal(dialogTabTarget(0, 3, true), 2);
  assert.equal(dialogTabTarget(1, 3, false), -1);
  assert.equal(dialogTabTarget(1, 3, true), -1);
  assert.equal(dialogTabTarget(0, 0, false), -1);
  assert.equal(dialogTabTarget(0, 1, false), 0);
});

test('전체 화면 대화상자 변경 감지 — 공백만 다르면 변경 아님', () => {
  assert.equal(dialogHasChanges({ title: '' }, { title: '  ' }), false);
  assert.equal(dialogHasChanges({ title: '' }, { title: 'OLED' }), true);
  assert.equal(dialogHasChanges({}, { note: 'x' }), true);
  assert.equal(dialogHasChanges({ a: '1' }, { a: '1' }), false);
});
