import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { COMPARE_PANELS, compareDocument } from '../scripts/compare.js';
import { schemeCssVars, deriveSchemeColors } from '../scripts/scheme.js';
import { PRESETS } from '../scripts/presets.js';

const html = await readFile(new URL('../patterns.html', import.meta.url), 'utf8');

test('Pages 비교: 패널 네 장 — 어두운 · 밝은 색마다 M3 기본과 절감 한 쌍', () => {
  assert.equal(COMPARE_PANELS.length, 4);
  for (const mode of ['dark-saving', 'light-saving']) {
    const pair = COMPARE_PANELS.filter(p => p.mode === mode);
    assert.deepEqual(pair.map(p => p.saving), [false, true]);
  }
  for (const panel of COMPARE_PANELS) assert.ok(html.includes(`data-compare-panel="${panel.id}"`), `${panel.id} 패널 누락`);
  const start = html.indexOf('data-compare>');
  const section = html.slice(start, html.indexOf('</figure></div>', start));
  assert.ok(start > 0 && !section.includes('BW'), '비교 화면에 BW 수치를 보이지 않는다');
});

test('Pages 비교: 패널 문서는 그 모드의 data-style과 색 변수를 갖고, 절감 패널만 .saving-apply', () => {
  for (const panel of COMPARE_PANELS) {
    const { vars } = schemeCssVars(PRESETS[panel.mode].tokens, panel.mode, 'standard');
    const doc = compareDocument(panel, '<div></div>', vars, ['styles/a.css']);
    assert.ok(doc.includes(`data-style="${panel.mode}"`));
    assert.ok(doc.includes('--primary:') && doc.includes('--bg-l:'));
    assert.equal(doc.includes('saving-apply'), panel.saving);
  }
});

test('schemeCssVars는 deriveSchemeColors의 역할 · 사다리 · 글자 역할을 모두 변수로 내린다', () => {
  const tokens = PRESETS['dark-saving'].tokens;
  const { vars } = schemeCssVars(tokens, 'dark-saving', 'standard');
  const scheme = deriveSchemeColors(tokens, 'dark-saving', 'standard');
  for (const role of [...Object.keys(scheme.roles), ...Object.keys(scheme.containers)]) assert.ok(`--${role}` in vars, role);
  for (const name of ['--primary-on-bg', '--secondary-on-bg', '--text-on-container', '--on-primary', '--tx-l']) assert.ok(name in vars, name);
});

test('글자로 쓰는 Error(--error-on-bg, 명세 4.1.8)는 두 모드 × 대비 3단계에서 배경 · 표면 · 컨테이너 위 본문 기준을 채운다', async () => {
  const { contrastTargets } = await import('../scripts/contrastLevels.js');
  const { primaryTextAnchors } = await import('../scripts/m3Palette.js');
  const { contrastBetween } = await import('../scripts/contrast.js');
  const { hslToRgb } = await import('../scripts/colorModel.js');
  const rgb = c => hslToRgb(c.h, c.s, c.l);
  for (const preset of ['dark-saving', 'light-saving']) {
    for (const level of ['standard', 'medium', 'high']) {
      const tokens = PRESETS[preset].tokens;
      const scheme = deriveSchemeColors(tokens, preset, level);
      const anchors = primaryTextAnchors(tokens.bg, tokens.surface, preset);
      const worst = Math.min(...anchors.map(a => contrastBetween(rgb(scheme.errorText.color), rgb(a))));
      assert.ok(worst >= contrastTargets(level).text - 0.05, `${preset} ${level}: ${worst.toFixed(2)}`);
      // 색상 · 채도는 Error 그대로, 명도만 옮긴다
      assert.equal(scheme.errorText.color.h, scheme.roles.error.h);
    }
  }
  const css = await readFile(new URL('../styles/molecules.css', import.meta.url), 'utf8');
  assert.ok(css.includes('--tf-label-c: var(--error-on-bg); --tf-support-c: var(--error-on-bg)'));
});

test('오류 필드 hover 라벨(--error-hover-on-bg): 기본 단계는 M3 on-error-container 그대로, 모든 단계에서 hover 바탕 위 기준 이상 · 평소 라벨보다 흐려지지 않음', async () => {
  const { contrastTargets } = await import('../scripts/contrastLevels.js');
  const { primaryTextAnchors, compositeOver, deriveSurfaceContainers } = await import('../scripts/m3Palette.js');
  const { contrastBetween } = await import('../scripts/contrast.js');
  const { hslToRgb } = await import('../scripts/colorModel.js');
  const rgb = c => hslToRgb(c.h, c.s, c.l);
  for (const preset of ['dark-saving', 'light-saving']) {
    const tokens = PRESETS[preset].tokens;
    const anchors = [...primaryTextAnchors(tokens.bg, tokens.surface, preset),
      compositeOver(deriveSurfaceContainers(tokens.bg, preset)['surface-container-highest'], tokens.text, 0.08)];
    const worst = c => Math.min(...anchors.map(a => contrastBetween(rgb(c), rgb(a))));
    for (const level of ['standard', 'medium', 'high']) {
      const s = deriveSchemeColors(tokens, preset, level);
      assert.ok(worst(s.errorHoverText.color) >= contrastTargets(level).text - 0.05, `${preset} ${level}`);
      assert.ok(worst(s.errorHoverText.color) >= worst(s.errorText.color) - 0.01, `${preset} ${level} 역전`);
      if (level === 'standard') assert.deepEqual(s.errorHoverText.color, s.roles['on-error-container']);
    }
  }
});

test('Pages 비교: 절감 선택은 컴포넌트별 Saving UI 추천 세트에서 읽어 온다(2026-10-20)', async () => {
  const { compareRecipe } = await import('../scripts/compare.js');
  const { SAVING_RECIPES } = await import('../scripts/saving.js');
  const dark = compareRecipe('dark-saving');
  const light = compareRecipe('light-saving');
  assert.deepEqual(dark, { cardType: 'outlined', buttons: { primary: 'filled', secondary: 'outlined', tertiary: 'text' }, appbarAction: null, fabColor: 'primary-container', listStyle: 'standard' });
  assert.deepEqual(light, { cardType: 'filled', buttons: { primary: 'filled', secondary: 'tonal', tertiary: 'text' }, appbarAction: 'filled', fabColor: 'primary', listStyle: 'segmented' });
  for (const mode of ['dark-saving', 'light-saving']) {
    assert.equal(compareRecipe(mode).cardType, SAVING_RECIPES.cards.modes[mode].set[0][0].type);
    // M3: 앱 바에 채운 · Tonal 버튼은 하나만
    const emphasized = (SAVING_RECIPES['app-bars'].modes[mode].set[0][0].actions ?? []).filter(a => a.type !== 'standard');
    assert.ok(emphasized.length <= 1, mode);
  }
});

test('비교 기준(M3 기본): 기본값이 없는 카드 유형은 모드마다 밝게 켜지는 쪽 — 절감 추천과 늘 다르다(2026-10-20)', async () => {
  const { M3_BASELINE } = await import('../scripts/saving.js');
  const { compareRecipe } = await import('../scripts/compare.js');
  assert.equal(M3_BASELINE['dark-saving'].cardType, 'filled');
  assert.equal(M3_BASELINE['light-saving'].cardType, 'outlined');
  for (const mode of ['dark-saving', 'light-saving']) assert.notEqual(M3_BASELINE[mode].cardType, compareRecipe(mode).cardType, mode);
});
