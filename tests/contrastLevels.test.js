import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTRAST_LEVELS, contrastTargets, contrastHeadroom } from '../scripts/contrastLevels.js';

/** material-color-utilities ContrastCurve의 normal / medium / high 값. */
test('세 단계 목표값이 Material 기준과 일치한다', () => {
  assert.deepEqual(
    ['standard', 'medium', 'high'].map(l => [CONTRAST_LEVELS[l].text, CONTRAST_LEVELS[l].nonText]),
    [[4.5, 3.0], [7.0, 4.5], [11.0, 7.0]],
  );
});

test('모든 단계가 WCAG AA 하한 이상이다', () => {
  for (const level of Object.values(CONTRAST_LEVELS)) {
    assert.ok(level.text >= 4.5);
    assert.ok(level.nonText >= 3.0);
  }
});

test('알 수 없는 단계는 표준으로 되돌린다', () => {
  assert.equal(contrastTargets('없음').text, 4.5);
  assert.equal(contrastTargets(undefined).text, 4.5);
});

test('여유분은 현재 대비를 단계 기준으로 나눈 값이다', () => {
  assert.equal(contrastHeadroom(9, 'standard'), 2);
  assert.equal(contrastHeadroom(7, 'medium'), 1);
  assert.ok(contrastHeadroom(4.5, 'high') < 1);
});
