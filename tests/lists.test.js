import test from 'node:test';
import assert from 'node:assert/strict';
import { listNextIndex, listEntryIndex, listSelect, listPositions, listItemLines } from '../scripts/lists.js';

test('목록 화살표 이동 — 끝에서 감싸고, 비활성은 건너뛰고, Home · End, RTL 반전', () => {
  const all = [true, true, true, true];
  assert.equal(listNextIndex(0, all, 'ArrowDown'), 1);
  assert.equal(listNextIndex(0, all, 'ArrowRight'), 1);
  assert.equal(listNextIndex(3, all, 'ArrowDown'), 0, '마지막에서 처음으로');
  assert.equal(listNextIndex(0, all, 'ArrowUp'), 3, '처음에서 마지막으로');
  assert.equal(listNextIndex(0, all, 'ArrowLeft'), 3);
  assert.equal(listNextIndex(2, all, 'Home'), 0);
  assert.equal(listNextIndex(1, all, 'End'), 3);
  assert.equal(listNextIndex(0, all, 'ArrowLeft', true), 1, 'RTL에서 왼쪽은 다음');
  assert.equal(listNextIndex(1, all, 'Tab'), 1, '다른 키는 그대로');
  const withDisabled = [true, false, true, false];
  assert.equal(listNextIndex(0, withDisabled, 'ArrowDown'), 2);
  assert.equal(listNextIndex(2, withDisabled, 'ArrowDown'), 0);
  assert.equal(listNextIndex(0, withDisabled, 'ArrowUp'), 2);
  assert.equal(listNextIndex(0, withDisabled, 'End'), 2, 'End는 마지막 포커스 가능 항목');
  assert.equal(listNextIndex(2, [false, false, true, true], 'Home'), 2, 'Home은 처음 포커스 가능 항목');
  assert.equal(listNextIndex(0, [false, false], 'ArrowDown'), -1);
});

test('목록 진입 — 선택 항목이 있으면 그리로, 없으면 처음(비활성 제외)', () => {
  assert.equal(listEntryIndex([false, true, true]), 1);
  assert.equal(listEntryIndex([false, false, false]), 0);
  assert.equal(listEntryIndex([false, false], [false, true]), 1);
  assert.equal(listEntryIndex([true, false], [false, true]), 1, '비활성 선택 항목은 건너뜀');
});

test('선택 — single은 하나만, multi는 뒤집기', () => {
  assert.deepEqual(listSelect([true, false, false], 2, 'single'), [false, false, true]);
  assert.deepEqual(listSelect([true, false, false], 0, 'single'), [true, false, false], '다시 눌러도 유지');
  assert.deepEqual(listSelect([true, false, true], 0, 'multi'), [false, false, true]);
  assert.deepEqual(listSelect([true, false, true], 1, 'multi'), [true, true, true]);
});

test('항목 자리 — 혼자 · 처음 · 가운데 · 끝(MDC updateAppearance)', () => {
  assert.deepEqual(listPositions(0), []);
  assert.deepEqual(listPositions(1), ['single']);
  assert.deepEqual(listPositions(2), ['first', 'last']);
  assert.deepEqual(listPositions(4), ['first', 'middle', 'middle', 'last']);
});

test('줄 수 — Compose ListItemType', () => {
  assert.equal(listItemLines(), 1);
  assert.equal(listItemLines({ supporting: true }), 2);
  assert.equal(listItemLines({ overline: true }), 2);
  assert.equal(listItemLines({ overline: true, supporting: true }), 3);
  assert.equal(listItemLines({ supporting: true, supportingMultiline: true }), 3);
});

test('컨테이너 본문 배경 묶음 — Lists 상태 레이어(on-surface 16%) · 선택 컨테이너를 더한다(명세 4.5.5)', async () => {
  const { containerTextAnchors, derivePaletteRoles, derivePrimaryOnBg } = await import('../scripts/m3Palette.js');
  const { PRESETS } = await import('../scripts/presets.js');
  const { contrastTargets } = await import('../scripts/contrastLevels.js');
  for (const [key, preset] of Object.entries(PRESETS)) {
    const t = contrastTargets('standard');
    const roles = derivePaletteRoles(preset.tokens, key, t.text, t).roles;
    const base = containerTextAnchors(preset.tokens.bg, preset.tokens.surface, key, roles.secondary);
    const list = containerTextAnchors(preset.tokens.bg, preset.tokens.surface, key, roles.secondary, { text: preset.tokens.text, secondaryContainer: roles['secondary-container'] });
    assert.equal(base.length, 8, '기존 묶음은 그대로');
    assert.equal(list.length, 11, '상태 레이어 1 + 선택 컨테이너 2');
    const onContainer = derivePrimaryOnBg(preset.tokens.text, list, t.text);
    assert.ok(onContainer.ratio >= t.text - 0.01, `${key}: ${onContainer.ratio}`);
  }
});
