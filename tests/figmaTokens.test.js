import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildFigmaTokenFiles, buildColorMode, COLOR_LAYOUT, SPACE, SHAPE, ELEVATION, EXT, modeName,
} from '../scripts/figmaTokens.js';
import { makeZip, crc32 } from '../scripts/zip.js';
import { defaultDrafts } from '../scripts/sharedState.js';
import { levelTokens, deriveSchemeColors } from '../scripts/scheme.js';

const drafts = defaultDrafts();
const files = buildFigmaTokenFiles({ drafts }, new Date('2026-10-04T00:00:00Z'));
const byName = Object.fromEntries(files.map(f => [f.name, f]));
const css = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8');
const FIGMA_TYPES = new Set(['color', 'dimension', 'number', 'fontFamily', 'duration']);

/** 토큰($value를 가진 객체)을 경로와 함께 모은다. */
function leaves(obj, path = []) {
  if (obj && typeof obj === 'object' && '$value' in obj) return [[path.join('/'), obj]];
  return Object.entries(obj).filter(([k]) => !k.startsWith('$')).flatMap(([k, v]) => leaves(v, [...path, k]));
}

test('묶음 구성: 색 6모드 + 기초 5 + 복합 1 + README', () => {
  const colors = files.filter(f => f.name.startsWith('color/'));
  assert.deepEqual(colors.map(f => f.name), [
    'color/Dark-Standard.tokens.json', 'color/Dark-Medium.tokens.json', 'color/Dark-High.tokens.json',
    'color/Light-Standard.tokens.json', 'color/Light-Medium.tokens.json', 'color/Light-High.tokens.json',
  ]);
  for (const name of ['space', 'shape', 'typescale', 'state', 'motion', 'styles']) assert.ok(byName[`${name}.tokens.json`], name);
  assert.ok(byName['README.txt']);
  // 톤 팔레트: 모드마다 파일 하나, 여섯 계열 × 14톤, 톤 0 · 100은 검정 · 흰색
  for (const mode of ['dark', 'light']) {
    const palette = JSON.parse(byName[`palette-${mode}.tokens.json`].text);
    assert.deepEqual(Object.keys(palette), ['primary', 'secondary', 'tertiary', 'error', 'neutral', 'neutral-variant']);
    assert.equal(leaves(palette).length, 6 * 14);
    assert.equal(palette.primary['0'].$value.hex, '#000000');
    assert.equal(palette.primary['100'].$value.hex, '#ffffff');
  }
});

test('색 6모드는 변수 이름 집합이 같고(모드 전환 조건), 모두 Figma가 받는 형식이다', () => {
  const names = files.filter(f => f.name.startsWith('color/')).map(f => leaves(JSON.parse(f.text)).map(([p]) => p).join(','));
  assert.equal(new Set(names).size, 1);
  const expected = Object.values(COLOR_LAYOUT).flat().length;
  assert.equal(names[0].split(',').length, expected);
  for (const [path, token] of leaves(JSON.parse(byName['color/Dark-Standard.tokens.json'].text))) {
    assert.equal(token.$type, 'color', path);
    assert.equal(token.$value.colorSpace, 'srgb');
    assert.equal(token.$value.components.length, 3);
    assert.match(token.$value.hex, /^#[0-9a-f]{6}$/);
    assert.ok(token.$extensions[EXT].cssVar === `--${path.split('/').pop()}`, path);
  }
});

test('Figma 가져오기 파일에는 받는 타입만, dimension은 px · duration은 s만 쓴다. 루트에 $키가 없다', () => {
  for (const f of files.filter(f => f.name.endsWith('.tokens.json') && f.name !== 'styles.tokens.json')) {
    const doc = JSON.parse(f.text);
    assert.ok(Object.keys(doc).every(k => !k.startsWith('$')), f.name);
    for (const [path, token] of leaves(doc)) {
      assert.ok(FIGMA_TYPES.has(token.$type), `${f.name} ${path} ${token.$type}`);
      if (token.$type === 'dimension') assert.equal(token.$value.unit, 'px');
      if (token.$type === 'duration') assert.equal(token.$value.unit, 's');
    }
  }
});

test('4토큰 자리가 표시되고, 값이 대비 단계를 적용한 4토큰과 같다', () => {
  const doc = buildColorMode(drafts['dark-saving'], 'dark-saving', 'medium');
  const tokens = levelTokens(drafts['dark-saving'], 'dark-saving', 'medium');
  const ext = t => t.$extensions[EXT];
  assert.equal(ext(doc.surface.background).bwToken, 'bg');
  assert.equal(ext(doc.surface['surface-container']).bwToken, 'surface');
  assert.equal(ext(doc.surface['on-surface']).bwToken, 'text');
  assert.equal(ext(doc.primary.primary).bwToken, 'accent');
  assert.deepEqual(ext(doc.surface['on-surface']).hsl, { h: Number(tokens.text.h.toFixed(2)), s: Number(tokens.text.s.toFixed(2)), l: Number(tokens.text.l.toFixed(2)) });
  // 비활성 글자는 Text의 알파 버전
  assert.equal(doc.text['text-disabled'].$value.alpha, 0.38);
  assert.equal(doc.text['text-disabled'].$value.hex, doc.surface['on-surface'].$value.hex);
});

test('대비 단계가 오를수록 본문 대비가 커진다(모드가 실제로 다르다)', () => {
  const l = level => buildColorMode(drafts['dark-saving'], 'dark-saving', level).surface['on-surface'].$extensions[EXT].hsl.l;
  assert.ok(l('standard') < l('medium') && l('medium') < l('high'));
  assert.equal(modeName('light-saving', 'high'), 'Light-High');
});

test('화면과 같은 파생 함수를 쓴다 — scheme의 역할 값이 그대로 나간다', () => {
  const tokens = levelTokens(drafts['light-saving'], 'light-saving', 'standard');
  const scheme = deriveSchemeColors(tokens, 'light-saving', 'standard');
  const doc = buildColorMode(drafts['light-saving'], 'light-saving', 'standard');
  assert.equal(doc.secondary['on-secondary-container'].$extensions[EXT].hsl.l, Number(scheme.roles['on-secondary-container'].l.toFixed(2)));
  assert.equal(doc.surface['surface-container-high'].$extensions[EXT].hsl.l, Number(scheme.containers['surface-container-high'].l.toFixed(2)));
  assert.equal(doc.text['text-on-container'].$extensions[EXT].hsl.l, Number(scheme.containerText.color.l.toFixed(2)));
});

test('기초 토큰 값이 styles/tokens.css와 같다', () => {
  for (const [step, value] of Object.entries(SPACE)) assert.ok(css.includes(`--md-space-${step}: ${value}px;`), `space ${step}`);
  for (const [name, value] of Object.entries(SHAPE)) assert.ok(css.includes(`--md-shape-${name}: ${value}px;`), `shape ${name}`);
  for (const [level, [[y1, b1], [y2, b2, s2]]] of Object.entries(ELEVATION)) {
    assert.ok(css.includes(`--md-elevation-${level}: 0 ${y1}px ${b1}px rgb(0 0 0 / .3), 0 ${y2}px ${b2}px ${s2}px rgb(0 0 0 / .15);`), `elevation ${level}`);
  }
  const motion = JSON.parse(byName['motion.tokens.json'].text);
  for (const [name, token] of Object.entries(motion.duration)) {
    assert.ok(css.includes(`--md-duration-${name}: ${Math.round(token.$value.value * 1000)}ms;`), name);
  }
  for (const [name, token] of Object.entries(motion.spring)) {
    assert.ok(css.includes(`--md-motion-spring-${name}-duration: ${Math.round(token.$value.value * 1000)}ms;`), name);
  }
});

test('복합 토큰: 글자 30 + 절감형 60 · 그림자 6 · 이징', () => {
  const styles = JSON.parse(byName['styles.tokens.json'].text);
  assert.equal(leaves(styles.typography).length, 90);
  // 절감형: 어두운 400(강조 500), 밝은 M3 +100 — 크기 · 줄 높이는 M3 그대로
  assert.equal(styles.typography['saving-dark'].baseline['title-medium'].$value.fontWeight, 400);
  assert.equal(styles.typography['saving-dark'].emphasized['label-large'].$value.fontWeight, 500);
  assert.equal(styles.typography['saving-light'].baseline['body-large'].$value.fontWeight, 500);
  assert.equal(styles.typography['saving-light'].emphasized['title-small'].$value.fontWeight, 700);
  assert.equal(styles.typography['saving-light'].baseline['body-large'].$extensions[EXT].figma.styleName, 'saving-light/baseline/body-large');
  assert.deepEqual(styles.typography['saving-dark'].baseline['body-large'].$value.fontSize, styles.typography.baseline['body-large'].$value.fontSize);
  assert.equal(styles.typography.baseline['body-large'].$value.lineHeight, 1.5);
  assert.equal(styles.typography.baseline['body-large'].$value.fontFamily, 'Gothic A1');
  assert.equal(JSON.parse(byName['typescale.tokens.json'].text).font.sans.$value, 'Gothic A1');
  const fig = styles.typography.emphasized['title-small'].$extensions[EXT].figma;
  assert.equal(fig.styleName, 'emphasized/title-small');
  const scale = JSON.parse(byName['typescale.tokens.json'].text);
  // 스타일이 가리키는 변수 경로가 typescale 파일에 실제로 있다
  const varNames = new Set(leaves(scale).map(([p]) => p));
  for (const [, token] of leaves(styles.typography)) {
    for (const v of Object.values(token.$extensions[EXT].figma.variables)) assert.ok(varNames.has(v), v);
  }
  assert.equal(leaves(styles.elevation).length, 6);
  assert.equal(styles.elevation['elevation-3'].$value[1].spread.value, 3);
  assert.deepEqual(styles.easing.standard.$value, [0.2, 0, 0, 1]);
});

test('zip: 로컬 헤더 · 중앙 디렉터리 · 끝 레코드와 CRC가 맞다', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const bytes = makeZip([{ name: 'a/한글.txt', text: 'hello' }]);
  const view = new DataView(bytes.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  const end = bytes.length - 22;
  assert.equal(view.getUint32(end, true), 0x06054b50);
  assert.equal(view.getUint16(end + 10, true), 1);
  const central = view.getUint32(end + 16, true);
  assert.equal(view.getUint32(central, true), 0x02014b50);
  assert.equal(view.getUint32(central + 16, true), crc32(new TextEncoder().encode('hello')));
});
