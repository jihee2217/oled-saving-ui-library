import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { TYPE_SCALE, TYPE_ROLES, TYPE_SIZES, typeToken, typeName, typeMeta, typeCss, lineHeightRatio, typeKey } from '../scripts/typeScale.js';

const css = await readFile(new URL('../styles/tokens.css', import.meta.url), 'utf8');
const decl = name => css.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim();

test('타입 스케일은 기본 15 · 강조 15단계다 (M3 Type scale tokens)', () => {
  for (const set of ['baseline', 'emphasized']) {
    assert.equal(Object.keys(TYPE_SCALE[set]).length, 15);
    for (const role of TYPE_ROLES) for (const size of TYPE_SIZES) assert.ok(TYPE_SCALE[set][typeKey(role, size)], `${set} ${role}-${size}`);
  }
});

test('tokens.css의 --md-type-* 30개가 typeScale.js 값과 같다', () => {
  for (const emphasized of [false, true]) {
    for (const role of TYPE_ROLES) for (const size of TYPE_SIZES) {
      const t = TYPE_SCALE[emphasized ? 'emphasized' : 'baseline'][typeKey(role, size)];
      const name = typeToken(role, size, emphasized);
      assert.equal(decl(name), typeCss(t), name);
      assert.equal(decl(`${name}-tracking`), `${t.tracking}px`, `${name}-tracking`);
    }
  }
});

test('M3 사이트 값 대조 — 크기 · 줄 높이 · 굵기 · 자간', () => {
  assert.deepEqual(TYPE_SCALE.baseline['display-large'], { size: 57, lineHeight: 64, weight: 400, tracking: 0 });
  assert.deepEqual(TYPE_SCALE.baseline['label-small'], { size: 11, lineHeight: 16, weight: 500, tracking: 0.1 });
  assert.equal(TYPE_SCALE.baseline['body-small'].tracking, 0.1);
  assert.equal(TYPE_SCALE.emphasized['body-small'].tracking, 0);
  assert.equal(TYPE_SCALE.emphasized['title-medium'].weight, 600);
  assert.equal(TYPE_SCALE.emphasized['display-large'].weight, 500);
});

test('강조 스타일은 크기 · 줄 높이는 같고 굵기만 더 무겁다', () => {
  for (const [key, base] of Object.entries(TYPE_SCALE.baseline)) {
    const emph = TYPE_SCALE.emphasized[key];
    assert.equal(emph.size, base.size, key);
    assert.equal(emph.lineHeight, base.lineHeight, key);
    assert.ok(emph.weight > base.weight, key);
  }
});

test('Light(300) 이하 굵기를 쓰지 않는다 (명세 3.2 하한)', () => {
  for (const set of Object.values(TYPE_SCALE)) for (const t of Object.values(set)) assert.ok(t.weight >= 400);
});

test('이름 · 메타 · 줄 높이 비율', () => {
  assert.equal(typeToken('title', 'medium', true), '--md-type-emphasized-title-medium');
  assert.equal(typeName('label', 'small', true), 'Emphasized Label Small');
  assert.equal(typeMeta('display', 'large'), '57/64 · 400 · 0');
  assert.equal(lineHeightRatio('headline', 'large'), 1.25);
  assert.equal(lineHeightRatio('body', 'medium'), 1.43);
  assert.equal(typeCss(TYPE_SCALE.baseline['body-large']), '400 1rem/1.5rem var(--font-sans)');
});
