import test from 'node:test';
import assert from 'node:assert/strict';
import { derivePalette, projectPalette, floorsForLevel, solveLightness,
         GATE_REFS, TOKEN_ORDER, ANCHOR_TOKENS, AA_FLOOR } from '../scripts/gate.js';
import { CONTRAST_LEVELS } from '../scripts/contrastLevels.js';
import { contrastBetween } from '../scripts/contrast.js';
import { hslToRgb } from '../scripts/colorModel.js';
import { PRESETS } from '../scripts/presets.js';

const intent = (key = 'dark-saving') => structuredClone(PRESETS[key].tokens);
const ratio = (a, b) => contrastBetween(hslToRgb(a.h, a.s, a.l), hslToRgb(b.h, b.s, b.l));

test('입력을 변경하지 않는다', () => {
  const base = intent();
  const copy = structuredClone(base);
  derivePalette(base, CONTRAST_LEVELS.high);
  assert.deepEqual(base, copy);
});

test('본문은 각 수준의 목표 대비에 정확히 맞춰진다', () => {
  for (const key of ['dark-saving', 'light-saving']) {
    for (const [name, level] of Object.entries(CONTRAST_LEVELS)) {
      const { tokens } = derivePalette(intent(key), level);
      // 본문은 배경·표면 둘 다를 만족해야 하므로, 더 빡빡한 쪽이 목표에 붙는다.
      const achieved = Math.min(ratio(tokens.text, tokens.bg), ratio(tokens.text, tokens.surface));
      assert.ok(achieved >= level.text - 0.05, `${key}/${name}: ${achieved.toFixed(2)} < ${level.text}`);
      // 「딱 붙는 값」이므로 목표를 크게 넘지 않는다.
      assert.ok(achieved < level.text + 0.5, `${key}/${name}: ${achieved.toFixed(2)} 가 목표 ${level.text}보다 과함`);
    }
  }
});

test('세 수준의 본문 명도가 모두 다르다 — 칼럼이 같아 보이지 않는다', () => {
  for (const key of ['dark-saving', 'light-saving']) {
    const values = Object.values(CONTRAST_LEVELS)
      .map(level => derivePalette(intent(key), level).tokens.text.l);
    assert.equal(new Set(values).size, 3, `${key}: ${values.join(' / ')}`);
  }
});

test('앵커 토큰(배경·표면·Primary)은 움직이지 않는다', () => {
  for (const key of ['dark-saving', 'light-saving']) {
    const base = intent(key);
    for (const level of Object.values(CONTRAST_LEVELS)) {
      const { tokens } = derivePalette(base, level);
      for (const anchor of ANCHOR_TOKENS) {
        assert.deepEqual(tokens[anchor], base[anchor], `${key}/${anchor}`);
      }
    }
  }
});

test('Primary가 상향 목표에 못 미치면 색을 바꾸지 않고 경고로 알린다', () => {
  // 프리셋 기본값은 이제 모든 수준을 넘기므로, 사용자가 Primary를 직접 낮춘 상황을 만든다.
  const weak = intent();
  weak.accent = { ...weak.accent, l: 45 };
  const { tokens, warnings } = derivePalette(weak, CONTRAST_LEVELS.high);
  const warning = warnings.find(w => w.key === 'accent');
  assert.ok(warning, '높음에서는 Primary 경고가 나와야 한다');
  assert.ok(warning.ratio < warning.target);
  assert.equal(tokens.accent.l, weak.accent.l, 'Primary는 그대로여야 한다');
  // 경고가 나더라도 WCAG AA 하한은 지킨다.
  assert.ok(ratio(tokens.accent, tokens.bg) >= AA_FLOOR.nonText);
});

test('프리셋 기본 Primary는 모든 대비 수준을 그대로 통과한다', () => {
  for (const key of ['dark-saving', 'light-saving']) {
    for (const [name, level] of Object.entries(CONTRAST_LEVELS)) {
      const { tokens, warnings } = derivePalette(intent(key), level);
      const achieved = ratio(tokens.accent, tokens.bg);
      assert.ok(achieved >= level.nonText,
        `${key}/${name}: Primary ${achieved.toFixed(2)}:1 < 목표 ${level.nonText}:1`);
      assert.equal(warnings.length, 0, `${key}/${name}: 경고가 없어야 한다`);
      // 기본값은 게이트가 건드리지 않는다.
      assert.equal(tokens.accent.l, PRESETS[key].tokens.accent.l);
    }
  }
});

test('같은 의도값에서 계산하므로 수준을 오가도 결과가 재현된다', () => {
  const base = intent();
  const first = derivePalette(base, CONTRAST_LEVELS.standard).tokens;
  derivePalette(base, CONTRAST_LEVELS.high);
  const again = derivePalette(base, CONTRAST_LEVELS.standard).tokens;
  assert.deepEqual(again, first);
});

test('하한 게이트는 모든 토큰의 AA를 보장한다', () => {
  // 일부러 대비를 깨뜨린 팔레트를 넣어도 하한까지는 끌어올린다.
  const broken = intent();
  broken.text.l = 6;
  const { tokens } = projectPalette(broken, floorsForLevel(CONTRAST_LEVELS.standard));
  for (const key of TOKEN_ORDER) {
    const target = GATE_REFS[key].kind === 'text' ? AA_FLOOR.text : AA_FLOOR.nonText;
    for (const refKey of GATE_REFS[key].refs) {
      assert.ok(ratio(tokens[key], tokens[refKey]) >= target - 0.05, `${key} vs ${refKey}`);
    }
  }
});

test('solveLightness는 방향을 지키고 해가 없으면 null을 준다', () => {
  const base = intent();
  assert.ok(solveLightness(base.text, [base.bg], 4.5, 'lighter') > base.bg.l);
  assert.equal(solveLightness(base.accent, [base.accent], 21, 'lighter'), null);
});
