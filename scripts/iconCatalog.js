/**
 * iconCatalog.js
 * Styles › Icons 카탈로그(Google Fonts Material Symbols)의 검색 · 카테고리 거르기.
 * 데이터는 scripts/material-symbols.js(인기순 [name, categoryIndex, path])이고 여기는 순수 계산만 한다.
 */

/** 검색어를 아이콘 이름 형식으로 — 소문자, 공백 · 하이픈은 밑줄(Google Fonts 이름 규칙). */
export function normalizeIconQuery(query) {
  return String(query || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/**
 * 조건에 맞는 아이콘을 원래 순서(인기순) 그대로 돌려준다.
 * 이름이 검색어로 시작하는 것을 앞에, 이름 중간에 들어 있는 것을 뒤에 둔다(각 묶음 안은 인기순).
 * @param {Array<[string, number, string]>} icons
 * @param {{query?: string, category?: number|'all'}} filter
 */
export function filterIcons(icons, { query = '', category = 'all' } = {}) {
  const q = normalizeIconQuery(query);
  const inCategory = category === 'all' ? icons : icons.filter(icon => icon[1] === category);
  if (!q) return inCategory;
  const starts = [];
  const contains = [];
  for (const icon of inCategory) {
    if (icon[0].startsWith(q)) starts.push(icon);
    else if (icon[0].includes(q)) contains.push(icon);
  }
  return starts.concat(contains);
}

/** 카테고리별 아이콘 수(칩 이름 옆 숫자). 인덱스 = categories 배열 순서. */
export function countByCategory(icons, categoryCount) {
  const counts = new Array(categoryCount).fill(0);
  for (const icon of icons) counts[icon[1]] += 1;
  return counts;
}

/**
 * Google Fonts 아이콘 필터와 같은 축(M3 Applying icons › Customizing Symbols).
 * 기본값은 카탈로그 데이터(material-symbols.js)에 실린 변형이다 — 다른 조합만 공식 저장소에서 받아 온다.
 */
export const ICON_AXES = {
  style: ['outlined', 'rounded', 'sharp'],
  fill: [0, 1],
  weight: [100, 200, 300, 400, 500, 600, 700],
  grade: [-25, 0, 200],
  size: [20, 24, 40, 48],
};
export const ICON_DEFAULTS = { style: 'outlined', fill: 0, weight: 400, grade: 0, size: 24 };

/** 카탈로그에 실린 기본 변형인지(받아 올 필요 없음). */
export function isDefaultVariant(axes) {
  return Object.keys(ICON_DEFAULTS).every(key => axes[key] === ICON_DEFAULTS[key]);
}

/**
 * google/material-design-icons의 변형 SVG 주소.
 * 파일 이름: {name}_{[wght{W}][grad{N25|200}][fill1]}_{size}px.svg — 기본값(wght 400 · grad 0 · fill 0)은 빼고 적는다.
 */
export function iconVariantUrl(name, { style = 'outlined', fill = 0, weight = 400, grade = 0, size = 24 } = {}) {
  let axis = '';
  if (weight !== 400) axis += `wght${weight}`;
  if (grade !== 0) axis += `grad${grade < 0 ? `N${-grade}` : grade}`;
  if (fill === 1) axis += 'fill1';
  const file = `${name}${axis ? `_${axis}` : ''}_${size}px.svg`;
  return `https://raw.githubusercontent.com/google/material-design-icons/master/symbols/web/${name}/materialsymbols${style}/${file}`;
}
