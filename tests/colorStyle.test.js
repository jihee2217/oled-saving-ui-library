import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTonalPalettes, PALETTE_TONES, PALETTE_FAMILIES, harmonizeHue, deriveStaticColorRoles,
         derivePaletteRoles, toneOf } from '../scripts/m3Palette.js';
import { PRESETS } from '../scripts/presets.js';
import { hslToRgb } from '../scripts/colorModel.js';
import { contrastBetween } from '../scripts/contrast.js';
import { CONTRAST_LEVELS } from '../scripts/contrastLevels.js';

const ratio = (a, b) => contrastBetween(hslToRgb(a.h, a.s, a.l), hslToRgb(b.h, b.s, b.l));
const PRIMARIES = [{ h: 10, s: 65, l: 66 }, { h: 140, s: 80, l: 45 }, { h: 265, s: 40, l: 40 }, { h: 0, s: 0, l: 50 }];

test('톤 팔레트는 M3 톤 14단계 × 6계열이고, 톤이 CIE L*로 맞는다', () => {
  assert.deepEqual(PALETTE_TONES, [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100]);
  for (const primary of PRIMARIES) {
    const palettes = deriveTonalPalettes(primary);
    assert.deepEqual(palettes.map(p => p.key), PALETTE_FAMILIES.map(f => f.key));
    for (const palette of palettes) {
      assert.equal(palette.tones.length, 14);
      for (const { tone, color } of palette.tones) {
        assert.ok(Math.abs(toneOf(color) - tone) <= 0.3, `${palette.key} ${tone}: ${toneOf(color)}`);
      }
      assert.equal(palette.tones[0].color.l, 0);
      assert.equal(palette.tones.at(-1).color.l, 100);
    }
  }
});

test('역할 색은 같은 톤 팔레트에서 나온다(보정되지 않은 역할)', () => {
  for (const key of ['dark-saving', 'light-saving']) {
    const tokens = PRESETS[key].tokens;
    const { roles } = derivePaletteRoles(tokens, key);
    const palettes = Object.fromEntries(deriveTonalPalettes(tokens.accent).map(p => [p.key, p]));
    for (const role of ['primary-container', 'secondary-container', 'tertiary-container', 'primary-fixed', 'tertiary-fixed-dim']) {
      const color = roles[role];
      if (color.shifted) continue;
      const family = role.startsWith('primary') ? 'primary' : role.startsWith('secondary') ? 'secondary' : 'tertiary';
      assert.equal(color.h, palettes[family].tones[0].color.h, `${key} ${role} 색상`);
      assert.equal(color.s, palettes[family].tones[0].color.s, `${key} ${role} 채도`);
    }
  }
});

test('Harmonize는 Primary 쪽으로 색상각 차이의 절반, 최대 15°만 돌린다(MCU Blend.harmonize)', () => {
  assert.equal(harmonizeHue(140, 10), 125);   // 차이 130 → 15° 제한
  assert.equal(harmonizeHue(20, 10), 15);     // 차이 10 → 5°
  assert.equal(harmonizeHue(350, 10), 0);     // 0°를 넘어 증가 방향
  assert.equal(harmonizeHue(30, 350), 15);    // 감소 방향
  assert.equal(harmonizeHue(200, 200), 200);  // 같은 색상각은 그대로
  for (let design = 0; design < 360; design += 17) {
    for (let source = 0; source < 360; source += 23) {
      const out = harmonizeHue(design, source);
      const moved = 180 - Math.abs(Math.abs(out - design) - 180);
      assert.ok(moved <= 15.05, `${design}→${source}: ${moved}`);
    }
  }
});

test('Static color 네 역할은 강조 톤 배치를 따르고 on 역할이 대비 단계를 채운다', () => {
  const inputs = [{ h: 140, s: 60, l: 35 }, { h: 45, s: 95, l: 50 }, { h: 210, s: 70, l: 45 }];
  for (const preset of ['dark-saving', 'light-saving']) {
    for (const level of Object.values(CONTRAST_LEVELS)) {
      for (const input of inputs) {
        for (const harmonize of [false, true]) {
          const { hue, roles } = deriveStaticColorRoles(input, PRIMARIES[0], preset, level.text, { harmonize });
          assert.equal(hue, harmonize ? harmonizeHue(input.h, PRIMARIES[0].h) : input.h);
          for (const color of Object.values(roles)) assert.equal(color.h, hue);
          assert.ok(ratio(roles.on, roles.color) >= level.text - 0.01, `${preset} ${level.text} on`);
          assert.ok(ratio(roles['on-container'], roles.container) >= level.text - 0.01, `${preset} ${level.text} on-container`);
        }
      }
    }
  }
  // 표준 대비에서는 톤 보정 없이 M3 톤 그대로다(색 40/80 · container 90/30).
  const light = deriveStaticColorRoles({ h: 140, s: 60, l: 35 }, PRIMARIES[0], 'light-saving', 4.5).roles;
  assert.ok(Math.abs(light.color.tone - 40) <= 0.3);
  assert.ok(Math.abs(light.container.tone - 90) <= 0.3);
  const dark = deriveStaticColorRoles({ h: 140, s: 60, l: 35 }, PRIMARIES[0], 'dark-saving', 4.5).roles;
  assert.ok(Math.abs(dark.color.tone - 80) <= 0.3);
  assert.ok(Math.abs(dark.container.tone - 30) <= 0.3);
});

test('선 역할이 대비 단계를 따른다 — outline 3 · 4.5 · 7, outline-variant 없음 · 3 · 4.5 (MCU ContrastCurve)', async () => {
  const { primaryTextAnchors } = await import('../scripts/m3Palette.js');
  for (const preset of ['dark-saving', 'light-saving']) {
    for (const accent of PRIMARIES) {
      const tokens = { ...PRESETS[preset].tokens, accent };
      const anchors = primaryTextAnchors(tokens.bg, tokens.surface, preset);
      const baseline = derivePaletteRoles(tokens, preset).roles;
      for (const [key, level] of Object.entries(CONTRAST_LEVELS)) {
        const { roles } = derivePaletteRoles(tokens, preset, level.text, level);
        const worst = role => Math.min(...anchors.map(anchor => ratio(roles[role], anchor)));
        assert.ok(worst('outline') >= level.outline - 0.01, `${preset} ${key} outline ${worst('outline')}`);
        if (level.outlineVariant > 1) assert.ok(worst('outline-variant') >= level.outlineVariant - 0.01, `${preset} ${key} outline-variant`);
        // 기본 단계에서 M3 톤이 이미 기준을 넘으면 값이 그대로다.
        if (key === 'standard') {
          assert.equal(roles.outline.l, baseline.outline.l);
          assert.equal(roles['outline-variant'].l, baseline['outline-variant'].l);
        }
      }
    }
  }
});
