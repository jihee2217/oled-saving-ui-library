import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hctFromRgb, toneFromY, formatHct } from '../scripts/hct.js';

/**
 * 검증 기준: material-color-utilities의 Hct.fromInt 출력값.
 * HCT는 표시 전용이므로(기준서 MD3-03), 참조 구현과 어긋나면 표시 자체가 무의미하다.
 */
const MCU_ANCHORS = [
  { name: 'red',   rgb: [255, 0, 0],   h: 27.41,  c: 113.36, t: 53.23 },
  { name: 'green', rgb: [0, 255, 0],   h: 142.14, c: 108.41, t: 87.74 },
  { name: 'blue',  rgb: [0, 0, 255],   h: 282.79, c: 87.23,  t: 32.30 },
];

test('CAM16 색상·채도·톤이 참조 구현과 일치한다', () => {
  for (const anchor of MCU_ANCHORS) {
    const hct = hctFromRgb(...anchor.rgb);
    assert.ok(Math.abs(hct.h - anchor.h) < 0.05, `${anchor.name} hue ${hct.h}`);
    assert.ok(Math.abs(hct.c - anchor.c) < 0.05, `${anchor.name} chroma ${hct.c}`);
    assert.ok(Math.abs(hct.t - anchor.t) < 0.05, `${anchor.name} tone ${hct.t}`);
  }
});

/**
 * Material 베이스라인 중립 팔레트(보라 기미가 있는 기본 스킴)의 톤 번호와 실제 hex.
 * Tone이 곧 CIE L*이므로 팔레트 번호와 소수점 한 자리 수준까지 맞아야 한다.
 */
const NEUTRAL_PALETTE = [
  { tone: 4,  hex: '#0f0d13' },
  { tone: 6,  hex: '#141218' },
  { tone: 10, hex: '#1d1b20' },
  { tone: 12, hex: '#211f26' },
  { tone: 17, hex: '#2b2930' },
  { tone: 22, hex: '#36343b' },
  { tone: 24, hex: '#3b383e' },
  { tone: 90, hex: '#e6e0e9' },
  { tone: 92, hex: '#ece6f0' },
  { tone: 98, hex: '#fef7ff' },
];

function rgbFromHex(hex) {
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
}

test('중립 팔레트의 Tone이 팔레트 번호와 일치한다', () => {
  for (const entry of NEUTRAL_PALETTE) {
    const { t } = hctFromRgb(...rgbFromHex(entry.hex));
    assert.ok(Math.abs(t - entry.tone) < 0.5, `N${entry.tone} ${entry.hex} → ${t.toFixed(2)}`);
  }
});

test('Tone은 검정 0, 흰색 100이다', () => {
  assert.equal(Math.round(hctFromRgb(0, 0, 0).t), 0);
  assert.equal(Math.round(hctFromRgb(255, 255, 255).t), 100);
  assert.ok(Math.abs(toneFromY(100) - 100) < 1e-9);
});

test('표시 문자열 형식', () => {
  assert.equal(formatHct({ h: 257.6, c: 48.1, t: 40.0 }), 'H 258 · C 48 · T 40');
});
