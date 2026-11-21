import test from 'node:test';
import assert from 'node:assert/strict';
import { TEXT_FIELD, tfCounter, tfMessage, tfValidate, tfAutoHeight } from '../scripts/textfield.js';

test('글자 수 · 보조 글 ↔ 오류 글 교체', () => {
  assert.deepEqual(tfCounter(3, 20), { text: '3/20', over: false, label: '글자 수 3자, 최대 20자' });
  assert.equal(tfCounter(21, 20).over, true);
  assert.deepEqual(tfMessage({ supporting: '도움말' }), { text: '도움말', error: false, role: null });
  assert.deepEqual(tfMessage({ supporting: '도움말', error: '오류' }), { text: '오류', error: true, role: 'alert' });
});

test('검증 · 여러 줄 높이 · 치수', () => {
  assert.match(tfValidate('', { required: true }), /필수/);
  assert.equal(tfValidate('a', { required: true }), '');
  assert.match(tfValidate('abc', { maxLength: 2 }), /2자/);
  assert.match(tfValidate('a@b', { type: 'email' }), /이메일/);
  assert.equal(tfValidate('a@b.co', { type: 'email' }), '');
  assert.deepEqual(tfAutoHeight(10), { height: 24, scroll: false });
  assert.deepEqual(tfAutoHeight(70), { height: 72, scroll: false });
  assert.deepEqual(tfAutoHeight(200, { maxRows: 4 }), { height: 96, scroll: true });
  assert.equal(TEXT_FIELD.padding + TEXT_FIELD.icon + TEXT_FIELD.iconGap - (TEXT_FIELD.padding - TEXT_FIELD.iconPadding), 52);   // 아이콘 있을 때 글 시작 52
});
