import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { filterIcons, normalizeIconQuery, countByCategory } from '../scripts/iconCatalog.js';

async function loadData() {
  const src = await readFile(new URL('../scripts/material-symbols.js', import.meta.url), 'utf8');
  const window = {};
  new Function('window', src)(window);
  return window.MATERIAL_SYMBOLS;
}

test('Material Symbols 데이터: 3,927개 · 카테고리 18개 · 인기순 · 경로 형식', async () => {
  const { categories, icons } = await loadData();
  assert.equal(categories.length, 18);
  assert.equal(icons.length, 3927);
  assert.equal(new Set(icons.map(i => i[0])).size, icons.length);
  assert.deepEqual(icons.slice(0, 4).map(i => i[0]), ['search', 'home', 'menu', 'close']);
  for (const [name, category, path] of icons) {
    assert.match(name, /^[a-z0-9_]+$/);
    assert.ok(Number.isInteger(category) && category >= 0 && category < 18, name);
    assert.match(path, /^[Mm][-\d]/, name);
  }
  // 이 라이브러리에 들어간 공식 아이콘(2026-09-27 교체분)과 같은 경로다.
  const home = icons.find(i => i[0] === 'home');
  assert.equal(home[2], 'M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z');
  assert.equal(countByCategory(icons, 18).reduce((a, b) => a + b, 0), 3927);
});

test('검색 · 카테고리 거르기', () => {
  const icons = [['home', 8, 'M0'], ['home_work', 11, 'M0'], ['add_home', 8, 'M0'], ['search', 17, 'M0'], ['settings_home', 17, 'M0']];
  assert.equal(normalizeIconQuery('  Home Work '), 'home_work');
  assert.equal(normalizeIconQuery('arrow-back'), 'arrow_back');
  assert.deepEqual(filterIcons(icons).map(i => i[0]), icons.map(i => i[0]));
  // 앞에서 일치하는 것이 먼저, 각 묶음 안은 원래(인기) 순서
  assert.deepEqual(filterIcons(icons, { query: 'home' }).map(i => i[0]), ['home', 'home_work', 'add_home', 'settings_home']);
  assert.deepEqual(filterIcons(icons, { query: 'home', category: 8 }).map(i => i[0]), ['home', 'add_home']);
  assert.deepEqual(filterIcons(icons, { category: 17 }).map(i => i[0]), ['search', 'settings_home']);
  assert.deepEqual(filterIcons(icons, { query: 'zzz' }), []);
});

test('변형 SVG 주소 — Google Fonts 필터 축 조합(저장소 파일 이름 규칙)', async () => {
  const { iconVariantUrl, isDefaultVariant, ICON_DEFAULTS } = await import('../scripts/iconCatalog.js');
  const base = 'https://raw.githubusercontent.com/google/material-design-icons/master/symbols/web/home/';
  assert.equal(iconVariantUrl('home'), `${base}materialsymbolsoutlined/home_24px.svg`);
  assert.equal(iconVariantUrl('home', { weight: 700, grade: -25, fill: 1 }), `${base}materialsymbolsoutlined/home_wght700gradN25fill1_24px.svg`);
  assert.equal(iconVariantUrl('home', { style: 'rounded', weight: 300, grade: -25, fill: 1, size: 20 }), `${base}materialsymbolsrounded/home_wght300gradN25fill1_20px.svg`);
  assert.equal(iconVariantUrl('home', { style: 'sharp', fill: 1, size: 40 }), `${base}materialsymbolssharp/home_fill1_40px.svg`);
  assert.equal(iconVariantUrl('home', { grade: 200, size: 40 }), `${base}materialsymbolsoutlined/home_grad200_40px.svg`);
  assert.ok(isDefaultVariant({ ...ICON_DEFAULTS }));
  assert.ok(!isDefaultVariant({ ...ICON_DEFAULTS, size: 48 }));
});
