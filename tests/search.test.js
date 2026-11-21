import test from 'node:test';
import assert from 'node:assert/strict';
import { searchFilter, searchNextIndex, SEARCH_BAR } from '../scripts/search.js';

test('제안 거르기 — 빈 검색어는 처음 max개, 아니면 포함 검색(대소문자 무시)', () => {
  const items = ['대비 단계', 'Dark mode', '절감 모드', '대비 높이기', 'Primary 색', '글자 크기', '여백'];
  assert.deepEqual(searchFilter(items, '', 3), ['대비 단계', 'Dark mode', '절감 모드']);
  assert.deepEqual(searchFilter(items, '대비'), ['대비 단계', '대비 높이기']);
  assert.deepEqual(searchFilter(items, 'DARK'), ['Dark mode']);
  assert.deepEqual(searchFilter(items, '  모드 '), ['절감 모드'], '앞뒤 공백 무시');
  assert.deepEqual(searchFilter(items, '없음'), []);
});

test('결과 이동 — 입력칸(-1) ↔ 결과, 끝에서 멈춤', () => {
  assert.equal(searchNextIndex(-1, 3, 'ArrowDown'), 0);
  assert.equal(searchNextIndex(2, 3, 'ArrowDown'), 2);
  assert.equal(searchNextIndex(0, 3, 'ArrowUp'), -1);
  assert.equal(searchNextIndex(-1, 3, 'ArrowUp'), -1);
  assert.equal(searchNextIndex(1, 3, 'Home'), 1);
  assert.equal(searchNextIndex(0, 0, 'ArrowDown'), -1);
});

test('검색 뷰 형태 — 600 미만 전체 화면, 이상 docked', () => {
  assert.deepEqual(SEARCH_BAR, { height: 56, minWidth: 360, maxWidth: 720 });
});
