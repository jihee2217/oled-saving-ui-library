/**
 * compare.js
 * Pages › Saving UI 비교(2026-10-18) — 같은 화면(주말 산책 피드, Compact 412)을 네 장으로 그린다.
 *   어두운 색: M3 기본 ↔ 어두운 절감 / 밝은 색: M3 기본 ↔ 밝은 절감.
 * 짝끼리는 색 토큰이 같고(계산기에서 정한 그 모드의 색), 컴포넌트를 쓰는 법만 다르다 — 차이가 곧 Saving UI 규칙이다.
 * 패널은 각자의 html[data-style]과 색 변수를 가져야 하므로 iframe(srcdoc)에 따로 그린다. 화면 BW 수치는 보이지 않는다
 * (라이브러리는 토큰별 BW만 보인다).
 */

import { FILLED_ICON_PATHS, SAVING_RECIPES, M3_BASELINE } from './saving.js';
import { layoutSpec } from './layout.js';
import { listPositions } from './lists.js';
import { schemeCssVars } from './scheme.js';

export const COMPARE_PANELS = [
  { id: 'dark-m3', mode: 'dark-saving', saving: false, title: 'M3 기본 · 어두운 색' },
  { id: 'dark-saving', mode: 'dark-saving', saving: true, title: '어두운 절감' },
  { id: 'light-m3', mode: 'light-saving', saving: false, title: 'M3 기본 · 밝은 색' },
  { id: 'light-saving', mode: 'light-saving', saving: true, title: '밝은 절감' },
];

export const COMPARE_WIDTH = 412;
export const COMPARE_HEIGHT = 760;

/**
 * 비교 화면에 입힐 절감 선택을 컴포넌트별 Saving UI 추천 세트(saving.js SAVING_RECIPES)에서 읽어 온다(2026-10-20).
 * 따로 적어 두지 않으므로 추천을 바꾸면 비교 화면도 함께 바뀐다.
 *   cardType     — Cards 세트의 카드 유형
 *   buttons      — Buttons 세트 두 번째 줄의 등급: 주(스플릿 버튼 앞쪽) · 보조(첫 버튼) · 덜 중요(둘째 버튼)
 *   appbarAction — App bars 세트(Small)의 뒤쪽 버튼 중 채운(filled · tonal) 것. 없으면 null(모두 Standard)
 *   fabColor     — FAB 세트의 색(Compact 피드에는 FAB가 없어 비교 화면에는 보이지 않음 · Pages 창의 펼친 레일에는 있음)
 *   listStyle    — Lists 세트의 목록 모양(Pages 창의 기사 화면 관련 기사)
 */
export function compareRecipe(mode) {
  const first = key => SAVING_RECIPES[key].modes[mode].set[0][0];
  const row = SAVING_RECIPES.buttons.modes[mode].set[1];
  const split = row.find(part => part.kind === 'split');
  const [secondary, tertiary] = row.filter(part => part.kind === 'button');
  const emphasized = (first('app-bars').actions ?? []).find(action => action.type !== 'standard');
  return {
    cardType: first('cards').type,
    buttons: { primary: split.lead, secondary: secondary.type, tertiary: tertiary.type },
    appbarAction: emphasized ? emphasized.type : null,
    fabColor: first('fab').color,
    listStyle: first('lists').style,
  };
}

const BUTTON_TYPES = ['filled', 'tonal', 'outlined', 'text', 'elevated', 'standard'];
const buttonType = btn => BUTTON_TYPES.find(name => btn.classList.contains(`btn-${name}`));
const setButtonType = (btn, type) => {
  BUTTON_TYPES.forEach(name => btn.classList.remove(`btn-${name}`));
  btn.classList.add(`btn-${type}`);
};
// 아이콘 채움 규칙에서 빼는 곳 — 선택을 모양으로 알리는 아이콘(내비게이션 · 칩 · 토글 버튼)과 사진이 들어갈 자리(카드 · 기사 사진)
const ICON_KEEP = '.m3-nav-item, .m3-nav-bar, .m3-nav-rail-items, .m3-chip, .icon-selected, .icon-unselected, .m3-card-media, .m3-article-media';

/**
 * 절감 규칙을 되돌린다(2026-10-20). 바꾼 곳마다 data-m3-*에 M3 값을 적어 두었으므로 그대로 돌려놓는다.
 * Pages 창의 Saving UI 스위치를 끄거나, 모드가 바뀌어 다시 입히기 전에 쓴다.
 */
export function clearSavingRules(root) {
  root.querySelectorAll('[data-m3-type]').forEach(el => { el.dataset.type = el.dataset.m3Type; delete el.dataset.m3Type; });
  root.querySelectorAll('[data-m3-btn]').forEach(el => { setButtonType(el, el.dataset.m3Btn); delete el.dataset.m3Btn; });
  root.querySelectorAll('[data-m3-color]').forEach(el => {
    if (el.dataset.m3Color) el.dataset.color = el.dataset.m3Color; else delete el.dataset.color;
    delete el.dataset.m3Color;
  });
  root.querySelectorAll('[data-m3-list]').forEach(el => {
    if (el.dataset.m3List) el.dataset.style = el.dataset.m3List; else delete el.dataset.style;
    delete el.dataset.m3List;
  });
  root.querySelectorAll('[data-m3-pos]').forEach(el => {
    if (el.dataset.m3Pos) el.dataset.pos = el.dataset.m3Pos; else delete el.dataset.pos;
    delete el.dataset.m3Pos;
  });
  root.querySelectorAll('path[data-m3-d]').forEach(path => { path.setAttribute('d', path.dataset.m3D); delete path.dataset.m3D; });
}

/**
 * 비교 기준(M3 기본)을 입힌다 — 기본값이 없는 카드 유형만 그 모드의 M3_BASELINE으로(saving.js). 나머지는 마크업의 M3 기본 그대로.
 * 바꾼 곳은 data-m3-*에 원래 값을 남겨 clearSavingRules로 되돌린다.
 */
export function applyM3Baseline(root, mode) {
  clearSavingRules(root);
  const { cardType } = M3_BASELINE[mode];
  root.querySelectorAll('.m3-card[data-type]').forEach(card => {
    if (card.dataset.type !== cardType) { card.dataset.m3Type = card.dataset.type; card.dataset.type = cardType; }
  });
}

/**
 * 절감 규칙을 화면에 입힌다(값은 compareRecipe — 추천 세트에서 읽음). 먼저 clearSavingRules로 M3 상태로 돌린 뒤 입히므로
 * 모드가 바뀌어도 다시 부르면 된다. 비교 패널(정적 복제본)과 Pages 창(조작 가능한 원본, 스위치) 모두 이 함수를 쓴다.
 *   카드: 추천 유형. 카드 버튼: 대표 카드(data-featured)는 주 버튼, 나머지 카드의 '읽기'는 보조 버튼(사용자 결정 2026-10-20).
 *   앱 바: 추천에 채운 버튼이 있으면 피드 앱 바의 주 동작(첫 버튼, 검색) 하나만 그 유형. 나머지는 Standard(M3: 채운 · Tonal 버튼은 하나만).
 *   FAB: 추천 색. 목록(관련 기사): 추천 모양(밝은 Segmented).
 *   상태 없는 아이콘: 공통 3.6(어두운 Outlined · 밝은 Filled). ICON_KEEP은 바꾸지 않는다.
 *   공통: 글자 굵기 · Standard 모션은 .saving-apply(organisms.css)가 맡는다 — 이 클래스는 부르는 쪽이 붙인다.
 */
export function applySavingRules(root, mode) {
  clearSavingRules(root);
  const recipe = compareRecipe(mode);
  const changeButton = (btn, type) => {
    const now = buttonType(btn);
    if (!now || now === type) return;
    btn.dataset.m3Btn = now;
    setButtonType(btn, type);
  };
  root.querySelectorAll('.m3-card[data-type]').forEach(card => {
    if (card.dataset.type !== recipe.cardType) { card.dataset.m3Type = card.dataset.type; card.dataset.type = recipe.cardType; }
    const tier = card.hasAttribute('data-featured') ? 'primary' : 'secondary';
    card.querySelectorAll('.m3-card-actions .btn').forEach(btn => changeButton(btn, recipe.buttons[tier]));
  });
  if (recipe.appbarAction) {
    const main = root.querySelector('[data-pane="main"] .appbar-actions .btn');
    if (main && buttonType(main) === 'standard') changeButton(main, recipe.appbarAction);
  }
  root.querySelectorAll('.m3-fab').forEach(fab => {
    if (fab.dataset.color === recipe.fabColor) return;
    fab.dataset.m3Color = fab.dataset.color ?? '';
    fab.dataset.color = recipe.fabColor;
  });
  root.querySelectorAll('.m3-li-list').forEach(list => {
    if ((list.dataset.style ?? 'standard') === recipe.listStyle) return;
    list.dataset.m3List = list.dataset.style ?? '';
    list.dataset.style = recipe.listStyle;
    const items = [...list.children].filter(el => el.classList.contains('m3-li'));
    listPositions(items.length).forEach((pos, i) => { items[i].dataset.m3Pos = items[i].dataset.pos ?? ''; items[i].dataset.pos = pos; });
  });
  const filled = mode === 'light-saving';
  root.querySelectorAll('svg.icon path').forEach(path => {
    if (path.closest(ICON_KEEP)) return;
    const d = path.getAttribute('d');
    const outlined = Object.keys(FILLED_ICON_PATHS).find(key => key === d)
      ?? Object.entries(FILLED_ICON_PATHS).find(([, value]) => value === d)?.[0];
    if (!outlined) return;
    const next = filled ? FILLED_ICON_PATHS[outlined] : outlined;
    if (next === d) return;
    path.dataset.m3D = d;
    path.setAttribute('d', next);
  });
}

/** Pages 창을 Compact 피드 한 장으로 복제한다(정적, 조작 없음). */
export function compareScreen(source) {
  const win = source.cloneNode(true);
  clearSavingRules(win);
  win.classList.remove('saving-apply');
  win.removeAttribute('data-fluid');
  win.removeAttribute('data-page');
  win.removeAttribute('style');
  win.removeAttribute('aria-label');
  win.dataset.width = String(COMPARE_WIDTH);
  win.dataset.layout = 'feed';
  win.dataset.screen = 'feed';
  const spec = layoutSpec(COMPARE_WIDTH, 'feed');
  Object.assign(win.dataset, { bp: spec.breakpoint, nav: spec.nav === 'bar' ? 'bar' : 'rail', panes: String(spec.panes), arrange: spec.arrange });
  win.style.cssText = `--win-w:${COMPARE_WIDTH}px; --win-h:${COMPARE_HEIGHT}px; --win-margin:${spec.margin}px; --win-spacer:${spec.spacer}px; --win-fixed:${spec.fixedPane}px; --feed-cols:${spec.columns}`;
  win.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
  win.setAttribute('inert', '');
  return win;
}

/** iframe 한 장의 문서. 스타일시트는 부모 문서의 것을 절대 주소로 그대로 쓴다. */
export function compareDocument(panel, screenHtml, vars, stylesheets) {
  const style = Object.entries(vars).map(([name, value]) => `${name}:${value}`).join(';');
  const links = stylesheets.map(href => `<link rel="stylesheet" href="${href}">`).join('');
  const bodyClass = panel.saving ? 'compare-body saving-apply' : 'compare-body';
  return `<!doctype html><html lang="ko" data-style="${panel.mode}" style="${style}"><head><meta charset="utf-8">${links}`
    + `<style>html,body{margin:0;background:var(--bg);overflow:hidden}.compare-body{display:block;min-height:0}</style></head>`
    + `<body class="${bodyClass}">${screenHtml}</body></html>`;
}

/** 패널 네 장을 그린다. inputs = app.js schemeInputs() → { level, tokens: {모드: 4토큰} } */
export function renderCompare(host, source, inputs) {
  const stylesheets = [...document.querySelectorAll('link[rel="stylesheet"]')]
    .map(link => link.href).filter(href => /\/styles\//.test(href));
  COMPARE_PANELS.forEach(panel => {
    const frame = host.querySelector(`iframe[data-compare-panel="${panel.id}"]`);
    if (!frame) return;
    const win = compareScreen(source);
    if (panel.saving) applySavingRules(win, panel.mode); else applyM3Baseline(win, panel.mode);
    const { vars } = schemeCssVars(inputs.tokens[panel.mode], panel.mode, inputs.level);
    frame.srcdoc = compareDocument(panel, win.outerHTML, vars, stylesheets);
  });
}
