import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSettings, defaultDrafts, defaultDraft } from '../scripts/sharedState.js';
import { PRESETS } from '../scripts/presets.js';

const settings = { preset: 'light-saving', tokens: structuredClone(PRESETS['light-saving'].tokens), contrastLevel: 'standard' };
settings.tokens.bg.l = 75.25;
// 의도 명도는 저장본에 없으면 적용값에서 끌어온다.
settings.intent = Object.fromEntries(
  ['bg', 'surface', 'text', 'accent'].map(key => [key, settings.tokens[key].l]));
// 작업본이 없는 저장본은 현재 모드만 저장값을 잇고 나머지는 프리셋 기본값이 된다.
settings.drafts = {
  'dark-saving': defaultDraft('dark-saving'),
  'light-saving': { tokens: structuredClone(settings.tokens), intent: { ...settings.intent } },
};

test('custom colors round trip without weights', () => {
  assert.deepEqual(parseSettings(JSON.stringify(settings)), settings);
});

test('legacy weights are discarded while custom colors are preserved', () => {
  for (const weights of [{ bg: 0, surface: 0, text: 0, accent: 0 }, { bg: 0.5, surface: 0.25, text: 0.15, accent: 0.1 }]) {
    assert.deepEqual(parseSettings(JSON.stringify({ ...settings, weights })), settings);
  }
});

test('invalid colors and incomplete settings are rejected', () => {
  for (const raw of [null, 'broken', '{}', JSON.stringify({ ...settings, preset: 'unknown' }),
    JSON.stringify({ ...settings, tokens: { ...settings.tokens, bg: { h: 0, s: 0, l: 101 } } })]) {
    assert.equal(parseSettings(raw), null);
  }
});

test('대비 수준은 허용 값만 통과하고 나머지는 표준으로 되돌린다', () => {
  for (const level of ['standard', 'medium', 'high']) {
    assert.equal(parseSettings(JSON.stringify({ ...settings, contrastLevel: level })).contrastLevel, level);
  }
  for (const level of [undefined, 'low', 'HIGH', 3]) {
    assert.equal(parseSettings(JSON.stringify({ ...settings, contrastLevel: level })).contrastLevel, 'standard');
  }
});

test('의도 명도는 저장·복원되고, 범위를 벗어나면 적용값으로 되돌린다', () => {
  const withIntent = { ...settings, intent: { ...settings.intent, accent: 12.5 } };
  assert.equal(parseSettings(JSON.stringify(withIntent)).intent.accent, 12.5);

  for (const broken of [undefined, -1, 101, 'x', null]) {
    const raw = { ...settings, intent: { ...settings.intent, accent: broken } };
    assert.equal(parseSettings(JSON.stringify(raw)).intent.accent, settings.tokens.accent.l);
  }
});

test('두 모드의 작업본이 따로 저장되고 복원된다', () => {
  const drafts = defaultDrafts();
  drafts['dark-saving'].tokens.surface.l = 21.5;
  drafts['dark-saving'].intent.surface = 21.5;
  const restored = parseSettings(JSON.stringify({ ...settings, paletteVersion: 3, drafts }));
  assert.equal(restored.drafts['dark-saving'].tokens.surface.l, 21.5);
  assert.equal(restored.drafts['dark-saving'].intent.surface, 21.5);
  // 현재 모드의 작업본은 최상위 값을 따른다.
  assert.deepEqual(restored.drafts['light-saving'].tokens, restored.tokens);
});

test('깨진 작업본은 그 모드만 프리셋 기본값으로 되돌린다', () => {
  const drafts = defaultDrafts();
  drafts['dark-saving'].tokens.text.l = 999;
  const restored = parseSettings(JSON.stringify({ ...settings, paletteVersion: 3, drafts }));
  assert.deepEqual(restored.drafts['dark-saving'], defaultDraft('dark-saving'));
  // 나머지 설정은 살아남는다.
  assert.equal(restored.tokens.bg.l, 75.25);
});

test('작업본이 없던 옛 저장본도 그대로 열린다', () => {
  const restored = parseSettings(JSON.stringify(settings));
  assert.deepEqual(restored.drafts['dark-saving'], defaultDraft('dark-saving'));
  assert.deepEqual(restored.drafts['light-saving'].tokens, restored.tokens);
});
