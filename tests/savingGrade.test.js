import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SAVING_RECIPES, SAVING_GRADES, savingGradeFor } from '../scripts/saving.js';

test('26개 묶음의 등급은 A 9 · B 10 · C 7개다', () => {
  const count = { A: 0, B: 0, C: 0 };
  for (const recipe of Object.values(SAVING_RECIPES)) count[recipe.grade] += 1;
  assert.deepEqual(count, { A: 9, B: 10, C: 7 });
});

test('등급마다 이름과 설명이 있다', () => {
  for (const grade of ['A', 'B', 'C']) {
    assert.equal(SAVING_GRADES[grade].label, `${grade}등급`);
    assert.ok(SAVING_GRADES[grade].text.length > 0);
  }
});

test('메뉴 항목의 등급은 그 묶음의 Saving UI 항목에서 읽는다', () => {
  assert.equal(savingGradeFor(['App bars', '#app-bars-saving']), 'A');
  assert.equal(savingGradeFor(['Button', 'Icon button', '#buttons-saving']), 'B');
  assert.equal(savingGradeFor(['Floating action button (FAB)', 'Extended FAB', 'FAB menu', '#fab-saving']), 'A');
  assert.equal(savingGradeFor(['Plain tooltip', 'Rich tooltip', '#tooltips-saving']), 'C');
});

test('Saving UI 항목이 없는 메뉴(Styles · Layout · Pages)는 등급이 없다', () => {
  assert.equal(savingGradeFor(['Color roles', 'Tonal palettes']), null);
  assert.equal(savingGradeFor(['#pages-example']), null);
  assert.equal(savingGradeFor(undefined), null);
});
