import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { TYPE_SCALE, TYPE_ROLES, TYPE_SIZES, typeKey } from '../scripts/typeScale.js';
import { savingWeight, savingIconFill, SAVING_COMMON_RULES, FILLED_ICON_PATHS, SAVING_ICONS } from '../scripts/saving.js';

// Saving UI 장면의 글자 굵기 · 아이콘 채움(명세 3.2 · 3.6, 2026-10-17)

test('굵기: 어두운 절감형은 기본 400 · 강조 500, 400 아래로 내려가지 않는다', () => {
  for (const w of [400, 500, 600]) {
    assert.equal(savingWeight(w, false, 'dark-saving'), 400);
    assert.equal(savingWeight(w, true, 'dark-saving'), 500);
  }
});

test('굵기: 밝은 절감형은 M3 굵기 + 100이고 Medium(500) 이상이다', () => {
  for (const set of ['baseline', 'emphasized']) {
    for (const role of TYPE_ROLES) for (const size of TYPE_SIZES) {
      const w = TYPE_SCALE[set][typeKey(role, size)].weight;
      const lw = savingWeight(w, set === 'emphasized', 'light-saving');
      assert.equal(lw, w + 100);
      assert.ok(lw >= 500);
    }
  }
});

test('organisms.css의 장면 타입 토큰 60개가 savingWeight와 같고 크기 · 줄 높이는 M3 그대로다', async () => {
  const tokens = await readFile(new URL('../styles/tokens.css', import.meta.url), 'utf8');
  const org = await readFile(new URL('../styles/organisms.css', import.meta.url), 'utf8');
  for (const mode of ['dark-saving', 'light-saving']) {
    const block = org.match(new RegExp(`html\\[data-style="${mode}"\\] :is\\(\\.saving-scene, \\.saving-apply\\) \\{([^}]+)\\}`))[1];
    let n = 0;
    for (const [, name, w, rest] of tokens.matchAll(/--md-type-((?:emphasized-)?[a-z]+-[a-z]+): (\d+) ([^;]+);/g)) {
      const got = block.match(new RegExp(`--md-type-${name}: (\\d+) ([^;]+);`));
      assert.ok(got, `${mode} ${name}`);
      assert.equal(Number(got[1]), savingWeight(Number(w), name.startsWith('emphasized-'), mode), `${mode} ${name}`);
      assert.equal(got[2], rest, `${mode} ${name} 크기 · 줄 높이`);
      n += 1;
    }
    assert.equal(n, 30);
  }
});

test('아이콘: 상태 없는 아이콘은 어두운 Outlined · 밝은 Filled, 선택 상태 아이콘은 두 모드 모두 켜짐만 Filled', () => {
  assert.equal(savingIconFill(null, 'dark-saving'), 'outlined');
  assert.equal(savingIconFill(null, 'light-saving'), 'filled');
  for (const mode of ['dark-saving', 'light-saving']) {
    assert.equal(savingIconFill('on', mode), 'filled');
    assert.equal(savingIconFill('off', mode), 'outlined');
  }
});

test('채움 글리프 표: 키(Outlined)와 값(Filled)이 다르고, Saving UI 기본 아이콘은 모두 Outlined다', () => {
  const filled = new Set(Object.values(FILLED_ICON_PATHS));
  for (const [outlined, f] of Object.entries(FILLED_ICON_PATHS)) {
    assert.notEqual(outlined, f);
    assert.ok(!filled.has(outlined));
  }
  for (const [name, d] of Object.entries(SAVING_ICONS)) assert.ok(!filled.has(d), `${name}은 Outlined여야 한다`);
});

test('공통 쓰는 법: 두 모드 모두 Typography · Icons(P1) · Motion(P4) 세 줄이 있다', () => {
  for (const mode of ['dark-saving', 'light-saving']) {
    assert.deepEqual(SAVING_COMMON_RULES[mode].map(r => r.axis), ['Typography', 'Icons', 'Motion']);
    assert.deepEqual(SAVING_COMMON_RULES[mode].map(r => r.principle), ['P1', 'P1', 'P4']);
  }
});

test('모션: 장면 안에서 Expressive 스프링 토큰 12개가 모두 Standard 토큰을 가리킨다 (명세 3.5)', async () => {
  const org = await readFile(new URL('../styles/organisms.css', import.meta.url), 'utf8');
  const tokens = await readFile(new URL('../styles/tokens.css', import.meta.url), 'utf8');
  const block = org.match(/html\[data-style\] :is\(\.saving-scene, \.saving-apply\) \{([^}]+)\}/)[1];
  let n = 0;
  for (const speed of ['fast', 'default', 'slow']) for (const type of ['spatial', 'effects']) for (const suffix of ['', '-duration']) {
    const name = `${speed}-${type}${suffix}`;
    assert.ok(block.includes(`--md-motion-spring-expressive-${name}: var(--md-motion-spring-standard-${name});`), name);
    assert.ok(tokens.includes(`--md-motion-spring-standard-${name}:`), `tokens.css ${name}`);
    n += 1;
  }
  assert.equal(n, 12);
});
