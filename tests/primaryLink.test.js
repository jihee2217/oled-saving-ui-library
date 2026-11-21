import test from 'node:test';
import assert from 'node:assert/strict';
import { linkedAccent, ratioBetweenHsl } from '../scripts/primaryLink.js';
import { PRESETS } from '../scripts/presets.js';
import { AA_FLOOR } from '../scripts/gate.js';

const dark = PRESETS['dark-saving'].tokens;
const light = PRESETS['light-saving'].tokens;

test('색상과 채도는 상대 모드로 그대로 옮겨간다', () => {
  const picked = { h: 210, s: 70, l: 62 };
  const { accent } = linkedAccent(picked, dark.bg, light.bg);
  assert.equal(accent.h, 210);
  assert.equal(accent.s, 70);
});

test('상대 모드의 명도는 원래 모드의 대비를 재현한다', () => {
  const source = ratioBetweenHsl(dark.accent, dark.bg);
  const { accent, matched } = linkedAccent(dark.accent, dark.bg, light.bg);
  assert.equal(matched, true);
  const mirrored = ratioBetweenHsl(accent, light.bg);
  // 0.1 단위 탐색이라 아래로는 붙지 않고, 필요 이상 올리지도 않는다.
  assert.ok(mirrored >= source, `${mirrored} >= ${source}`);
  assert.ok(mirrored - source < 0.35, `${mirrored} - ${source} 가 너무 큼`);
});

test('명도까지 공유했을 때 생기는 미달을 링크가 해소한다', () => {
  // 밝은 절감형 Primary를 어두운 배경에 그대로 쓰면 3:1 미달이다.
  assert.ok(ratioBetweenHsl(light.accent, dark.bg) < AA_FLOOR.nonText);
  const { accent } = linkedAccent(light.accent, light.bg, dark.bg);
  assert.ok(ratioBetweenHsl(accent, dark.bg) >= AA_FLOOR.nonText);
});

test('원래 모드에서 대비가 낮아도 상대 모드는 비텍스트 하한을 지킨다', () => {
  const weak = { h: 10, s: 65, l: 12 };           // 어두운 배경 위 거의 안 보이는 Primary
  assert.ok(ratioBetweenHsl(weak, dark.bg) < AA_FLOOR.nonText);
  const { accent, target } = linkedAccent(weak, dark.bg, light.bg);
  assert.equal(target, AA_FLOOR.nonText);
  assert.ok(ratioBetweenHsl(accent, light.bg) >= AA_FLOOR.nonText);
});

test('왕복해도 색상과 채도는 보존된다', () => {
  const picked = { h: 137, s: 48, l: 55 };
  const toLight = linkedAccent(picked, dark.bg, light.bg).accent;
  const backToDark = linkedAccent(toLight, light.bg, dark.bg).accent;
  assert.equal(backToDark.h, picked.h);
  assert.equal(backToDark.s, picked.s);
});

test('상대 배경으로 목표 대비를 낼 수 없으면 기존 명도를 남기고 알린다', () => {
  // 회색 배경 위에서는 어떤 명도로도 매우 높은 대비를 만들 수 없다.
  const midBg = { h: 0, s: 0, l: 50 };
  const strong = { h: 0, s: 0, l: 100 };          // 검은 배경 위 흰색 → 매우 높은 대비
  const black = { h: 0, s: 0, l: 0 };
  const fallback = { h: 0, s: 0, l: 20 };
  const { accent, matched } = linkedAccent(strong, black, midBg, fallback);
  assert.equal(matched, false);
  assert.equal(accent.l, 20);
  assert.equal(accent.h, 0);
});
