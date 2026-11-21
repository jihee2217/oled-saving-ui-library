import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { STATE_LAYER_OPACITY, DISABLED_OPACITY, activeState, parseLayerColor, stateLayerColor, layerContrast, dragPosition } from '../scripts/states.js';

const css = await readFile(new URL('../styles/tokens.css', import.meta.url), 'utf8');
const decl = name => css.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim();

test('상태 레이어 불투명도는 M3 사이트 · Compose StateTokens와 같다 (8 · 10 · 10 · 16%)', () => {
  assert.deepEqual(STATE_LAYER_OPACITY, { enabled: 0, hover: 0.08, focus: 0.1, pressed: 0.1, dragged: 0.16 });
  assert.deepEqual(DISABLED_OPACITY, { content: 0.38, container: 0.12 });
});

test('tokens.css --md-state-*가 states.js 값과 같고 옛 --state-*는 그것을 가리킨다', () => {
  const pct = v => `${Math.round(v * 100)}%`;
  assert.equal(decl('--md-state-hover'), pct(STATE_LAYER_OPACITY.hover));
  assert.equal(decl('--md-state-focus'), pct(STATE_LAYER_OPACITY.focus));
  assert.equal(decl('--md-state-pressed'), pct(STATE_LAYER_OPACITY.pressed));
  assert.equal(decl('--md-state-dragged'), pct(STATE_LAYER_OPACITY.dragged));
  assert.equal(decl('--md-state-disabled-content'), pct(DISABLED_OPACITY.content));
  assert.equal(decl('--md-state-disabled-container'), pct(DISABLED_OPACITY.container));
  for (const [old, now] of [['hover', 'hover'], ['focus', 'focus'], ['press', 'pressed'], ['drag', 'dragged']]) {
    assert.equal(decl(`--state-${old}`), `var(--md-state-${now})`);
  }
  assert.equal(decl('--md-focus-ring-width'), '3px');
  assert.equal(decl('--md-focus-ring-offset'), '2px');
  assert.equal(decl('--md-focus-ring-color'), 'var(--secondary)');
});

test('포커스 링은 토큰을 쓴다', async () => {
  const f = await readFile(new URL('../styles/foundations.css', import.meta.url), 'utf8');
  assert.ok(f.includes('outline: var(--md-focus-ring-width) solid var(--md-focus-ring-color); outline-offset: var(--md-focus-ring-offset);'));
});

test('한 번에 한 레이어 — 겹치면 dragged > pressed > focus > hover', () => {
  assert.equal(activeState({}), 'enabled');
  assert.equal(activeState({ hover: true, focus: true }), 'focus');
  assert.equal(activeState({ hover: true, pressed: true, focus: true }), 'pressed');
  assert.equal(activeState({ pressed: true, dragged: true }), 'dragged');
});

test('색 계산 — color-mix와 같은 섞기, 대비, 파싱', () => {
  assert.deepEqual(parseLayerColor('rgb(10, 20, 30)'), [10, 20, 30]);
  assert.deepEqual(parseLayerColor('color(srgb 1 0 0.5)'), [255, 0, 127.5]);
  assert.deepEqual(stateLayerColor([255, 255, 255], [0, 0, 0], 0.1).map(Math.round), [230, 230, 230]);
  assert.equal(Math.round(layerContrast([0, 0, 0], [255, 255, 255])), 21);
  assert.equal(dragPosition(10, -50, 100), 0);
  assert.equal(dragPosition(90, 50, 100), 100);
});

test('컴포넌트 포커스 링 · 비활성 불투명도는 토큰을 쓴다 (하드코딩 없음)', async () => {
  for (const f of ['molecules.css', 'organisms.css']) {
    const css = await readFile(new URL(`../styles/${f}`, import.meta.url), 'utf8');
    assert.ok(!/outline:\s*[23]px solid var\(--secondary\)/.test(css), `${f}: 포커스 링 하드코딩`);
    assert.ok(!/\.m3-(chip|card|carousel)[^{]*\{[^}]*opacity:\s*\.38/.test(css), `${f}: 비활성 38% 하드코딩`);
  }
});

test('글자로 쓰는 Secondary(--secondary-on-bg)를 파생하고 내비게이션 활성 라벨이 쓴다', async () => {
  const app = await readFile(new URL('../scripts/app.js', import.meta.url), 'utf8');
  const mol = await readFile(new URL('../styles/molecules.css', import.meta.url), 'utf8');
  // 색 변수는 scheme.js schemeCssVars가 만들고 app.js가 루트에 내려보낸다(2026-10-18, Pages 비교 패널과 공유)
  const scheme = await readFile(new URL('../scripts/scheme.js', import.meta.url), 'utf8');
  assert.ok(scheme.includes("vars['--secondary-on-bg']") && app.includes('schemeCssVars('));
  assert.ok(mol.includes('.badge-nav-item[data-active="true"] .badge-nav-label { color: var(--secondary-on-bg); }'));
});
