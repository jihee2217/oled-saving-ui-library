import test from 'node:test';
import assert from 'node:assert/strict';
import { checkboxParentState, checkboxParentToggle } from '../scripts/checkbox.js';

test('부모 체크박스: 전부 선택 → 선택, 전부 해제 → 해제, 일부 → 불확정', () => {
  assert.equal(checkboxParentState([true, true, true]), 'checked');
  assert.equal(checkboxParentState([false, false]), 'unchecked');
  assert.equal(checkboxParentState([true, false, false]), 'indeterminate');
});

test('불확정·해제 부모를 누르면 전부 선택, 선택 부모를 누르면 전부 해제', () => {
  assert.equal(checkboxParentToggle('indeterminate'), true);
  assert.equal(checkboxParentToggle('unchecked'), true);
  assert.equal(checkboxParentToggle('checked'), false);
});
