import { applyPreset, schemeInputs } from './app.js';
import { deriveTonalPalettes } from './m3Palette.js';
import { renderCompare, applySavingRules, applyM3Baseline } from './compare.js';
import { chipNextIndex, chipFocusAfterRemove } from './chips.js';
import { checkboxParentState, checkboxParentToggle } from './checkbox.js';
import { CAROUSEL, carouselArrangement, carouselItemBox, carouselMaxPosition } from './carousel.js';
import { listNextIndex, listEntryIndex, listSelect, listPositions, listItemLines } from './lists.js';
import { LOADING, loadingFrame, loadingDeterminate, morphPath, PROGRESS, EASE, linearDeterminate, linearStop, linearSegment, linearIndeterminateParts, waveAmplitudeFor, circularDeterminate, circularIndeterminate, circularWaveCount } from './progress.js';
import { LOADING_SHAPES } from './loadingShapes.js';
import { menuNextIndex, menuTypeahead, menuSelect, menuClosesOnSelect, menuPlacement } from './menus.js';
import { searchFilter, searchNextIndex } from './search.js';
import { tabsNextIndex, tabsIndicator, tabsScrollTo } from './tabs.js';
import { tfCounter, tfMessage, tfValidate, tfAutoHeight } from './textfield.js';
import { toolbarScroll, toolbarFabSize, toolbarNextIndex, toolbarDockedGap } from './toolbar.js';
import { tooltipPlace, tooltipHideDelay } from './tooltip.js';
import { fabMenuStagger } from './fabMenu.js';
import { layoutSpec, layoutScale } from './layout.js';
import { snackbarDuration, snackbarEnqueue, snackbarNext, snackbarLayout } from './snackbar.js';
import { SLIDER_SIZES, SLIDER, sliderFraction, sliderPos, sliderValueAt, sliderSegments, sliderStops, sliderKey, sliderNearest } from './slider.js';
import { sheetOffset, sheetSettle, sheetHandleNext, sheetVelocity } from './sheets.js';
import { NAV_RAIL, navCenteredPadding, navRailExpandedWidth, navNextIndex, navSelect } from './navigation.js';
import { formatBadgeCount, badgeAccessibleLabel, badgeTracking } from './badge.js';
import { filterIcons, countByCategory, ICON_DEFAULTS, isDefaultVariant, iconVariantUrl } from './iconCatalog.js';
import { TYPE_ROLES, TYPE_SIZES, typeToken, typeName, typeMeta } from './typeScale.js';
import { STATE_LAYER_OPACITY, STATE_NAMES, activeState, parseLayerColor, layerContrast, dragPosition } from './states.js';
import { SPRINGS, SPRING_SCHEMES, SPRING_SPEEDS, SPRING_TYPES, SPRING_CURVES, springEasing, springDuration, EASINGS, DURATIONS, EASING_PAIRS, cssEasing, curvePath } from './motion.js';
import { SAVING_RECIPES, SAVING_ICONS, FILLED_ICON_PATHS, savingIconFill, SAVING_COMMON_RULES, SAVING_GRADES, savingGradeFor } from './saving.js';
import { contrastTargets } from './contrastLevels.js';
import { contrastBetween } from './contrast.js';
import { calendarDate, shiftCalendarMonth, calendarKey } from './calendar.js';
import { CUBE_VERTICES, cubeWeights, cubePoint } from './bwCube.js';
import { DIALOG_FOCUSABLE, dialogTabTarget, dialogHasChanges } from './dialog.js';
import { sameDay, datePickerKeyTarget, parseDateInput, formatDateInput, nextRangeSelection, inDateRange, dateSelectable, yearRange } from './datePicker.js';
import { dialAngle, dialValueAt, dialLabelPosition, to24Hour, from24Hour, parseTimeField, pad2 } from './timePicker.js';

// Saving UI가 장면으로 쓰는 Live 견본의 처음 모습 — 각 블록이 그리거나 상태를 바꾸기 전에 떠 둔다(맨 끝 Saving UI 블록)
const SAVING_SOURCES = {};
Object.values(SAVING_RECIPES).forEach(r => Object.values(r.modes).forEach(m => m.set.flat().forEach(p => {
  if (p.kind === 'live' && !(p.src in SAVING_SOURCES)) SAVING_SOURCES[p.src] = document.querySelector(p.src)?.outerHTML || '';
})));

// 보기 전환 바(아일랜드) 공통 — 고른 값 기억(localStorage) · 라디오 표시. 저장소가 없으면 기본값으로 동작한다.
const loadView = (key, view) => { try { Object.assign(view, JSON.parse(localStorage.getItem(key)) || {}); } catch (error) { /* 저장소 없음 */ } return view; };
const saveView = (key, view) => { try { localStorage.setItem(key, JSON.stringify(view)); } catch (error) { /* 저장소 없음 */ } };
const markRadios = (group, value) => group?.querySelectorAll('[role="radio"]').forEach(button => {
  const on = button.dataset.value === value;
  button.setAttribute('aria-checked', String(on));
  button.tabIndex = on ? 0 : -1;
});
// 아일랜드에서 값을 고르면(클릭 · 방향키) 그 축의 값을 넘긴다.
const onIslandPick = (bar, axisSelector, pick) => {
  const sync = event => {
    const group = event.target.closest(axisSelector);
    const checked = group?.querySelector('[role="radio"][aria-checked="true"]');
    if (checked) pick(checked.dataset.value, group);
  };
  bar?.addEventListener('click', sync);
  bar?.addEventListener('keydown', sync);
};


// 탭 전환 (Overview, Styles, Components, Layout, Pages — 왼쪽 내비게이션 레일)
// 세로 탭 목록이라 위 · 아래(좌 · 우도 허용) · Home · End로 이동하고, 옮기면 바로 그 구성을 연다(자동 활성).
// 사이드바에는 그 구성의 하위 메뉴만 보이고, 하위 메뉴가 없으면(Overview) 사이드바 열을 접는다.
const railTabs = [...document.querySelectorAll('.pl-tab')];
function syncSidebar(panelId) {
  const sidebar = document.getElementById('pl-sidebar');
  if (!sidebar) return;
  let hasMenu = false;
  sidebar.querySelectorAll('.pl-side-menu .pl-comp-nav').forEach(nav => {
    const on = nav.dataset.panel === panelId;
    nav.hidden = !on;
    hasMenu ||= on;
  });
  sidebar.toggleAttribute('data-no-menu', !hasMenu);
}
function selectRailTab(tab, { focus = false } = {}) {
  const panelId = 'panel-' + tab.dataset.panel;
  railTabs.forEach(t => {
    const on = t === tab;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
  });
  document.querySelectorAll('.pl-panel').forEach(p => p.classList.toggle('active', p.id === panelId));
  syncSidebar(panelId);
  document.getElementById('library-preview')?.scrollTo({ top: 0 });
  if (focus) tab.focus();
  try { localStorage.setItem('bw-rail-tab', tab.dataset.panel); } catch (error) { /* 저장소 없음 */ }
}
// Overview(라이브러리 소개, 2026-10-18)의 구성 카드 · 버튼 — 해당 레일 탭을 연다. 포커스는 그 탭으로 옮겨 어디로 왔는지 알린다.
document.addEventListener('click', event => {
  const go = event.target.closest('[data-goto-panel]');
  if (!go) return;
  const tab = railTabs.find(t => t.dataset.panel === go.dataset.gotoPanel);
  if (tab) selectRailTab(tab, { focus: true });
});
railTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectRailTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (['ArrowDown', 'ArrowRight'].includes(event.key)) next = (index + 1) % railTabs.length;
    if (['ArrowUp', 'ArrowLeft'].includes(event.key)) next = (index + railTabs.length - 1) % railTabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = railTabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    selectRailTab(railTabs[next], { focus: true });
  });
});

// M3 토글 버튼: 누를 때마다 선택 상태를 바꾼다(형태 모핑은 CSS가 맡는다).
document.querySelectorAll('[data-toggle-button]').forEach(button => {
  button.addEventListener('click', () => button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true')));
});

// ─── Single-selection groups: roving focus and native button activation ───
document.querySelectorAll('.btn-group-connected[role="radiogroup"]').forEach(group => {
  const buttons = [...group.querySelectorAll('.btn')];
  const select = button => buttons.forEach(item => {
    const selected = item === button;
    item.setAttribute('aria-checked', String(selected));
    item.removeAttribute('aria-pressed');
    item.tabIndex = selected ? 0 : -1;
  });
  select(buttons.find(button => button.getAttribute('aria-checked') === 'true') || buttons[0]);
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => select(button));
    button.addEventListener('keydown', event => {
      let next;
      if (['ArrowRight', 'ArrowDown'].includes(event.key)) next = (index + 1) % buttons.length;
      if (['ArrowLeft', 'ArrowUp'].includes(event.key)) next = (index + buttons.length - 1) % buttons.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      select(buttons[next]);
      buttons[next].focus();
    });
  });
});

// Split button 메뉴는 Menus 컴포넌트(.m3-menu, 명세 4.6.3)가 연다 — 아래 Menus 블록.
document.querySelector('[data-split-main]')?.addEventListener('click', () => {
  document.getElementById('split-result').textContent = '저장했습니다.';
});

// ─── Motion 곡선 재생기(2026-09-29) — 칸에 마우스를 올리는 동안 점이 실제 지속 시간으로 곡선을 따라간다 ───
// 평소에는 곡선만 보이고, 올리면 처음부터 재생 → 끝에서 머문 뒤 반복, 내리면 멈추고 점을 감춘다.
// 동작 줄이기 설정이면 올렸을 때 점을 끝에만 보인다.
const curvePlayer = (() => {
  const items = new Map();   // svg → { pts, duration, dot, cursor, start }
  const playing = new Set();
  const HOLD = 700;          // 끝에서 머무는 시간(ms)
  let frame = 0;
  const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const yAt = (pts, x) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i += 1) {
      const [x1, y1] = pts[i];
      if (x <= x1) { const [x0, y0] = pts[i - 1]; return y0 + (y1 - y0) * ((x - x0) / ((x1 - x0) || 1)); }
    }
    return pts[pts.length - 1][1];
  };
  const place = (item, progress) => {
    const x = progress * 96;
    item.dot.setAttribute('cx', x.toFixed(1));
    item.dot.setAttribute('cy', yAt(item.pts, x).toFixed(1));
    item.cursor.setAttribute('x1', x.toFixed(1));
    item.cursor.setAttribute('x2', x.toFixed(1));
  };
  const tick = now => {
    frame = 0;
    playing.forEach(svg => {
      const item = items.get(svg);
      if (item.start == null) item.start = now;
      const t = (now - item.start) % (item.duration + HOLD);
      place(item, Math.min(1, t / item.duration));
    });
    if (playing.size) frame = requestAnimationFrame(tick);
  };
  const start = svg => {
    const item = items.get(svg);
    svg.toggleAttribute('data-playing', true);
    if (reduce()) { place(item, 1); return; }
    item.start = null;
    place(item, 0);
    playing.add(svg);
    if (!frame) frame = requestAnimationFrame(tick);
  };
  const stop = svg => { playing.delete(svg); svg.removeAttribute('data-playing'); };
  return {
    add(svg, pts, duration) {
      items.set(svg, { pts, duration: Math.max(1, duration), dot: svg.querySelector('.m3-motion-dot'), cursor: svg.querySelector('.m3-motion-cursor'), start: null });
      // 칸(.m3-motion-tile)이 만들어진 뒤에 붙도록 한 박자 늦춘다.
      queueMicrotask(() => {
        const host = svg.closest('.m3-motion-tile') || svg;
        host.addEventListener('pointerenter', () => start(svg));
        host.addEventListener('pointerleave', () => stop(svg));
      });
    },
  };
})();

// 컴포넌트 메뉴 — m3.material.io/components 사이드 메뉴의 최상위 항목과 같은 이름·순서.
// M3에서 하위 메뉴를 가진 묶음(Buttons · Date & time pickers · Navigation · Sheets)은
// 하위 메뉴를 펼치지 않고 한 페이지에 모아 보여 준다(단, Floating action button은 Buttons에서, Loading indicator · Progress indicators는 Loading & progress에서 떼어 따로 둔다). items는 그 페이지의 견본 항목(.pl-item-name 텍스트)이다.
const COMPONENT_MENU = [
  { label: 'App bars', items: ['App bars', '#app-bars-saving'] },
  { label: 'Badges', items: ['Badge', '#badges-saving'] },
  { label: 'Buttons', items: ['Button', 'Toggle button', 'Icon button', 'Toggle icon button', 'Split button',
    'Standard button group', 'Connected button group', '#buttons-saving'] },
  { label: 'Cards', items: ['Card', '#cards-saving'] },
  { label: 'Carousel', items: ['Carousel', '#carousel-saving'] },
  { label: 'Checkbox', items: ['Checkbox', '#checkbox-saving'] },
  { label: 'Chips', items: ['Chips', '#chips-saving'] },
  { label: 'Date & time pickers', items: ['Date pickers', 'Time pickers', '#date-time-pickers-saving'] },
  { label: 'Dialogs', items: ['Dialog', '#dialogs-saving'] },
  { label: 'Divider', items: ['Divider', '#divider-saving'] },
  // FAB · Extended FAB는 M3 Buttons 묶음의 하위 페이지다. 크기 · 색 체계가 버튼과 달라 Buttons 페이지 보기 옵션
  // (Size · Shape · Type · Icon)을 따라갈 수 없으므로 풀네임으로 따로 두고 알파벳 순서에 넣는다
  // (2026-09-28, 조정 UI 규칙: 페이지 옵션은 모든 견본이 따를 때만).
  { label: 'Floating action button', items: ['Floating action button (FAB)', 'Extended FAB', 'FAB menu', '#fab-saving'] },
  { label: 'Lists', items: ['List', '#lists-saving'] },
  // Loading & progress 묶음은 두 하위 컴포넌트의 보기 옵션(Containment / Shape · Thickness)이 서로 따를 수 없어
  // M3 하위 메뉴 이름으로 나눠 알파벳 순서에 둔다(2026-10-01, FAB와 같은 조정 UI 규칙).
  { label: 'Loading indicator', items: ['Loading indicator', '#loading-indicator-saving'] },
  { label: 'Menus', items: ['Menu', '#menus-saving'] },
  // Navigation 묶음 — M3 하위 메뉴 Navigation bar · Navigation rail을 한 페이지에(조정 옵션은 각 Live 아일랜드).
  // Navigation drawer는 M3 Expressive에서 권장하지 않아(펼친 레일로 대체) 견본을 두지 않는다(2026-10-03).
  { label: 'Navigation', items: ['Navigation bar', 'Navigation rail', '#navigation-saving'] },
  { label: 'Progress indicators', items: ['Progress indicators', '#progress-indicators-saving'] },
  { label: 'Radio button', items: ['Radio button', '#radio-button-saving'] },
  { label: 'Search', items: ['Search bar', 'Search view', '#search-saving'] },
  { label: 'Sheets', items: ['Bottom sheet', 'Side sheet', '#sheets-saving'] },
  { label: 'Sliders', items: ['Slider', '#sliders-saving'] },
  { label: 'Snackbar', items: ['Snackbar', '#snackbar-saving'] },
  { label: 'Switch', items: ['Switch', '#switch-saving'] },
  { label: 'Tabs', items: ['Tabs', '#tabs-saving'] },
  { label: 'Text fields', items: ['Text fields', '#text-fields-saving'] },
  { label: 'Toolbars', items: ['Docked toolbar', 'Floating toolbar', '#toolbars-saving'] },
  { label: 'Tooltips', items: ['Plain tooltip', 'Rich tooltip', '#tooltips-saving'] },
];

// 절감 등급 표시(2026-11-17) — Components 메뉴 항목과 그 페이지 첫 견본 제목 옆에 동그라미 안 글자(A · B · C)로 보인다.
// 등급은 그 묶음의 Saving UI 추천 조합(saving.js)에서 읽는다.
COMPONENT_MENU.forEach(entry => { entry.grade = savingGradeFor(entry.items); });
// 견본 제목 글자만(옆에 붙은 등급 표시는 뺀다)
function itemNameText(item) {
  const name = item.querySelector('.pl-item-name')?.cloneNode(true);
  name?.querySelectorAll('.pl-grade').forEach(badge => badge.remove());
  return name?.textContent.trim() || '';
}
function gradeBadge(grade, focusable) {
  const badge = document.createElement('span');
  badge.className = 'pl-grade';
  badge.dataset.grade = grade;
  badge.textContent = grade;
  badge.setAttribute('role', 'img');
  badge.setAttribute('aria-label', `절감 ${SAVING_GRADES[grade].label}`);
  badge.dataset.tip = `절감 ${SAVING_GRADES[grade].label} — ${SAVING_GRADES[grade].text}`;
  if (focusable) badge.tabIndex = 0;
  return badge;
}

// 스타일 메뉴 — m3.material.io/styles 사이드 메뉴의 최상위 항목과 같은 이름·순서.
// States는 M3에서 Styles가 아니라 Foundations › Interaction에 있다. 라이브러리의 상태 레이어 견본을 둘 곳이라 끝에 둔다.
const STYLE_MENU = [
  { label: 'Color', items: ['Color roles', 'Add-on color roles', 'Tonal palettes', 'Static colors'] },
  { label: 'Elevation', items: ['Elevation levels', 'Depicting elevation', 'Component elevation'] },
  { label: 'Icons', items: ['Icons catalog'] },
  { label: 'Motion', items: ['Motion physics system', 'Easing and duration', 'Transitions'] },
  { label: 'Shape', items: ['Corner radius scale'] },
  { label: 'Spacing', items: ['System spacing tokens', 'Parts of spacing', 'Applying spacing'] },
  { label: 'Typography', items: ['Type scale', 'Applying type'] },
  { label: 'States', items: ['State layers', 'Applying states'] },
];

// Layout 메뉴 — m3.material.io/foundations/layout 사이드 메뉴(Breakpoints · Canonical layout examples, 2026-10-04)
const LAYOUT_MENU = [
  { label: 'Breakpoints', items: ['Breakpoints'] },
  { label: 'Canonical layout examples', items: ['Feed', 'List-detail', 'Supporting pane'] },
];

// Pages 메뉴(2026-10-20) — 예시 화면 구성(조작 가능한 창 · Saving UI 스위치)과 Saving UI 비교(네 장)를 따로 연다.
// 한 페이지에 쌓으면 위 창이 화면을 다 채워 아래 비교를 지나치기 쉬워서 메뉴로 나눴다.
const PAGES_MENU = [
  { id: 'example-screens', label: '예시 화면 구성', items: ['#pages-example'] },
  { id: 'saving-ui-compare', label: 'Saving UI 비교', items: ['#pages-compare'] },
];

/**
 * 패널 하나의 메뉴(한 줄 목록)를 만든다. 메뉴 항목을 고르면 그 항목의 견본만 보이고,
 * 페이지 제목과 보기 전환 바가 제목 아래로 온다. Components · Styles가 같은 틀을 쓴다.
 */
function setupPanelMenu(panelId, menu, storageKey, fallbackId) {
  const panel = document.getElementById(panelId);
  const list = panel?.querySelector('.pl-comp-nav ul');
  if (!list) return;
  const title = panel.querySelector('.pl-comp-title');
  const empty = panel.querySelector('.pl-comp-empty');
  // 페이지 머리(보기 옵션 · 제목 옆 도구)는 스크롤해도 위에 붙어 있다. 제목은 보이지 않게 두고(스크린 리더용),
  // 보기 옵션은 늘 펼쳐 둔다. 보일 도구가 없으면 머리를 비운다(data-empty).
  const pageHead = panel.querySelector('.pl-comp-page');
  const headRow = panel.querySelector('.pl-comp-head');
  const drawer = document.createElement('div');
  drawer.className = 'pl-comp-controls';
  drawer.id = `${panelId}-controls`;
  const drawerInner = document.createElement('div');
  drawerInner.className = 'pl-comp-controls-inner';
  drawer.append(drawerInner);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'pl-comp-controls-toggle';
  toggle.setAttribute('aria-controls', drawer.id);
  toggle.innerHTML = '<svg class="icon icon-symbol" viewBox="0 -960 960 960" aria-hidden="true"><path d="M440-120v-240h80v80h320v80H520v80h-80Zm-320-80v-80h240v80H120Zm160-160v-80H120v-80h160v-80h80v240h-80Zm160-80v-80h400v80H440Zm160-160v-240h80v80h160v80H680v80h-80Zm-480-80v-80h400v80H120Z"/></svg><span class="pl-comp-controls-label">보기 옵션</span><span class="pl-comp-controls-summary"></span><svg class="icon icon-symbol pl-comp-controls-chevron" viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/></svg>';
  // 보기 옵션은 서랍 없이 맨 위 줄에 늘 펼쳐 둔다(2026-09-28). 버튼(toggle)은 요약 계산용으로만 남기고 붙이지 않는다.
  pageHead.append(drawer);
  let drawerOpen = true;
  const summarize = () => {
    const parts = [...drawerInner.querySelectorAll('.view-controls:not([hidden]) .view-control')].map(control => {
      const checked = control.querySelector('[role="radio"][aria-checked="true"], .active[aria-pressed="true"]');
      const box = control.querySelector('input[type="checkbox"]');
      return checked ? checked.textContent.trim() : box ? `${control.querySelector('.view-control-label')?.textContent.trim()} ${box.checked ? 'On' : 'Off'}` : '';
    }).filter(Boolean);
    toggle.querySelector('.pl-comp-controls-summary').textContent = parts.join(' · ');
  };
  const setDrawer = open => {
    drawerOpen = open;
    toggle.setAttribute('aria-expanded', String(open));
    drawer.toggleAttribute('data-open', open);
    drawer.inert = !open;
  };
  toggle.addEventListener('click', () => setDrawer(!drawerOpen));
  // 보기 바의 선택이 바뀌면(각 바의 스크립트가 먼저 처리한 뒤) 요약을 다시 쓴다.
  ['click', 'keydown', 'change'].forEach(type => drawerInner.addEventListener(type, () => requestAnimationFrame(summarize)));
  const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const allItems = [...panel.querySelectorAll('.pl-items > .pl-item')];
  const byName = new Map(allItems.map(item => [item.querySelector('.pl-item-name')?.textContent.trim(), item]));

  menu.forEach(entry => {
    entry.id ||= slug(entry.label);   // 한글 이름(Pages)은 id를 직접 준다
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${entry.id}`;
    link.textContent = entry.label;
    if (entry.grade) link.append(gradeBadge(entry.grade, false));
    link.dataset.menu = entry.id;
    li.append(link);
    list.append(li);
    entry.link = link;
  });

  const show = id => {
    const entry = menu.find(e => e.id === id) || menu.find(e => e.id === fallbackId);
    // 이름이 겹치는 항목(묶음마다 있는 'Saving UI')은 '#id'로 가리킨다.
    const shown = new Set((entry.items || []).map(name => name.startsWith('#') ? panel.querySelector(name) : byName.get(name)).filter(Boolean));
    allItems.forEach(item => { item.hidden = !shown.has(item); });
    panel.querySelectorAll('.pl-section[data-category]').forEach(section => {
      section.hidden = ![...shown].some(item => section.contains(item));
    });
    menu.forEach(e => (e === entry ? e.link.setAttribute('aria-current', 'page') : e.link.removeAttribute('aria-current')));
    title.textContent = entry.label;
    // 등급 표시는 페이지의 첫 견본 제목 옆에 하나만 둔다(견본마다 붙이면 번잡하다).
    panel.querySelectorAll('.pl-item-name > .pl-grade').forEach(badge => badge.remove());
    if (entry.grade) allItems.find(item => shown.has(item))?.querySelector('.pl-item-name')?.append(gradeBadge(entry.grade, true));

    // 견본이 없는 메뉴는 상태 문구를 보인다.
    empty.replaceChildren();
    empty.hidden = !entry.empty;
    if (entry.empty) {
      const p = document.createElement('p');
      p.textContent = entry.empty;
      empty.append(p);
    }

    // 보기 전환 바는 그 바가 조작하는 견본이 보일 때만, 페이지 제목 바로 아래에 둔다.
    panel.querySelectorAll('.view-controls').forEach(bar => {
      const attr = bar.dataset.targetAttr || 'data-view-target';
      const on = [...shown].some(item => item.hasAttribute(attr));
      bar.hidden = !on;
      // data-placement="title"인 도구(예: Icons 검색)는 페이지 제목 옆에, 나머지 보기 바는 제목 아래에 둔다.
      // 배치(2026-09-28 조정 UI 규칙): 기본은 페이지 아일랜드(맨 위). 그 항목의 Live 데모에만 적용되는 옵션은
      // data-placement="live" — 항목 상자 안 Live 블록 제목 바로 아래(Live 아일랜드)에 둔다.
      if (on && bar.dataset.placement === 'live') {
        const item = [...shown].find(el => el.hasAttribute(attr));
        const live = item && [...item.querySelectorAll('.btn-spec-block')].find(block => block.getAttribute('aria-label') === 'Live');
        (live?.querySelector('.btn-spec-live-head') || live)?.append(bar);   // Live 패널 머리줄 오른쪽(명세 5.4, 2026-10-04)
      } else if (on) (bar.dataset.placement === 'title' ? headRow : drawerInner).append(bar);
    });
    // 이 페이지에 서랍으로 들어간 보기 바가 없으면 버튼째 숨긴다.
    const hasControls = [...drawerInner.querySelectorAll('.view-controls')].some(bar => !bar.hidden);
    toggle.hidden = !hasControls;
    drawer.hidden = !hasControls;
    const hasTitleTools = [...headRow.querySelectorAll(':scope > .view-controls')].some(bar => !bar.hidden);
    pageHead.toggleAttribute('data-empty', !hasControls && !hasTitleTools);
    summarize();
    try { localStorage.setItem(storageKey, entry.id); } catch (error) { /* 저장소 없음 */ }
    return entry;
  };

  // 메뉴는 사이드바로 옮겨지므로(아래) 패널이 아니라 메뉴 자신에 듣는다.
  const nav = list.closest('.pl-comp-nav');
  nav.addEventListener('click', event => {
    const link = event.target.closest('a[data-menu]');
    if (!link) return;
    event.preventDefault();
    const entry = show(link.dataset.menu);
    history.replaceState(null, '', `#${entry.id}`);
    title.focus({ preventScroll: true });
    document.getElementById('library-preview')?.scrollTo({ top: 0 });
  });

  let initial = location.hash.slice(1);
  if (!menu.some(e => e.id === initial)) {
    try { initial = localStorage.getItem(storageKey) || ''; } catch (error) { initial = ''; }
  }
  show(initial);
  setDrawer(drawerOpen);
  // 하위 메뉴를 사이드바 위 칸으로 옮긴다. 어느 구성의 메뉴인지 표시해 두고 레일 탭 전환 때 하나만 보인다.
  const sideMenu = document.getElementById('pl-side-menu');
  if (sideMenu) { nav.dataset.panel = panelId; sideMenu.append(nav); }
  // 붙어 있는 머리 높이를 넘겨 포커스 · 앵커 스크롤이 그 아래로 오게 한다(WCAG 2.4.11).
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => {
      if (panel.classList.contains('active')) document.documentElement.style.setProperty('--pl-page-h', `${Math.round(pageHead.getBoundingClientRect().height)}px`);
    }).observe(pageHead);
  }
}

setupPanelMenu('panel-components', COMPONENT_MENU, 'bw-component', 'buttons');
setupPanelMenu('panel-styles', STYLE_MENU, 'bw-style', 'color');
setupPanelMenu('panel-layout', LAYOUT_MENU, 'bw-layout', 'breakpoints');
setupPanelMenu('panel-pages', PAGES_MENU, 'bw-pages', 'example-screens');

// 처음 열 구성: 주소 해시가 가리키는 메뉴가 있는 패널 → 지난번 탭 → Overview(첫 탭)
(() => {
  const hash = location.hash.slice(1);
  let target = null;
  if (hash && COMPONENT_MENU.some(e => e.id === hash)) target = 'components';
  else if (hash && STYLE_MENU.some(e => e.id === hash)) target = 'styles';
  else if (hash && LAYOUT_MENU.some(e => e.id === hash)) target = 'layout';
  else if (hash && PAGES_MENU.some(e => e.id === hash)) target = 'pages';
  if (!target) { try { target = localStorage.getItem('bw-rail-tab'); } catch (error) { target = null; } }
  const tab = railTabs.find(t => t.dataset.panel === target) || railTabs[0];
  if (tab) selectRailTab(tab);
})();

// 공통 툴팁(2026-09-28) — 계산기 도움말(? 아이콘, data-help="원천 id")과 아이콘 버튼 설명(data-tip).
// 레일 · 사이드바가 넘침을 자르는 칸이라 툴팁은 화면 기준(fixed)으로 띄운다. 기본은 위쪽, 자리가 없으면 아래.
// 마우스를 올리거나 키보드로 포커스하면 뜨고, 툴팁 위로 마우스를 옮겨도 유지되며, Esc로 닫힌다(WCAG 1.4.13).
// 도움말 원천(.calc-help-src)은 숨겨 둔 채 계산기 스크립트가 값을 계속 갱신하므로, 뜰 때마다 그 내용을 복사한다.
(() => {
  const tip = document.createElement('div');
  tip.id = 'pl-tip';
  tip.className = 'pl-tip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.append(tip);
  let owner = null, hideTimer = 0;
  const place = trigger => {
    const r = trigger.getBoundingClientRect();
    tip.style.left = '0px'; tip.style.top = '0px';
    const t = tip.getBoundingClientRect();
    const gap = 8;
    let top = r.top - t.height - gap;
    tip.dataset.side = 'top';
    if (top < gap) { top = r.bottom + gap; tip.dataset.side = 'bottom'; }
    const left = Math.min(window.innerWidth - t.width - gap, Math.max(gap, r.left + r.width / 2 - t.width / 2));
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  };
  const show = trigger => {
    clearTimeout(hideTimer);
    const src = trigger.dataset.help && document.getElementById(trigger.dataset.help);
    const text = src ? src.innerHTML : trigger.dataset.tip;
    if (!text) return;
    tip.innerHTML = text;
    tip.hidden = false;
    owner = trigger;
    place(trigger);
  };
  const hide = (now = false) => {
    clearTimeout(hideTimer);
    const run = () => { tip.hidden = true; owner = null; };
    if (now) run(); else hideTimer = setTimeout(run, 120);
  };
  const TRIGGER = '.calc-help, [data-tip]';
  document.addEventListener('pointerover', e => { const t = e.target.closest?.(TRIGGER); if (t) show(t); });
  document.addEventListener('pointerout', e => { const t = e.target.closest?.(TRIGGER); if (t && !t.contains(e.relatedTarget) && !tip.contains(e.relatedTarget)) hide(); });
  tip.addEventListener('pointerenter', () => clearTimeout(hideTimer));
  tip.addEventListener('pointerleave', () => hide());
  document.addEventListener('focusin', e => { const t = e.target.closest?.(TRIGGER); if (t && e.target.matches(':focus-visible')) show(t); else if (owner && !t) hide(true); });
  document.addEventListener('focusout', e => { if (owner?.contains(e.target)) hide(true); });   // 트리거 안의 입력(스위치 라벨 안 input)도
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !tip.hidden) { hide(true); } });
  // 터치 · 클릭: ? 아이콘은 눌러서 열고 닫는다(도움말은 동작이 없는 버튼)
  document.addEventListener('click', e => {
    const t = e.target.closest?.('.calc-help');
    if (t) { e.preventDefault(); if (owner === t && !tip.hidden) hide(true); else show(t); }
  });
  window.addEventListener('resize', () => owner && !tip.hidden && place(owner));
  document.addEventListener('scroll', () => owner && !tip.hidden && hide(true), true);
})();

// ─── Overview 두 번째 칸 뒤집는 카드(2026-10-20) — 마우스는 올리면(CSS :hover), 터치 · 클릭 · 키보드(Enter · Space)는 눌러서 뒤집는다 ───
// 파이 둘째 · 셋째 조각 — 지금 모드 Primary의 Tonal palette 톤(밝은 T80 · T10 / 어두운 T30 · T90)
(() => {
  const host = document.querySelector('.ov-why');
  if (!host) return;
  const paint = () => {
    const mode = document.documentElement.dataset.style === 'light-saving' ? 'light-saving' : 'dark-saving';
    const accent = schemeInputs().tokens[mode]?.accent;
    if (!accent) return;
    const tones = deriveTonalPalettes(accent).find(p => p.key === 'primary')?.tones || [];
    const at = t => { const c = tones.find(x => x.tone === t)?.color; return c ? `hsl(${c.h} ${c.s}% ${c.l}%)` : ''; };
    const [two, three] = mode === 'light-saving' ? [80, 10] : [30, 90];   // Primary 위 · 아래로 갈라 이웃 조각끼리 톤 25 이상
    host.style.setProperty('--ov-pie-2', at(two));
    host.style.setProperty('--ov-pie-3', at(three));
  };
  document.addEventListener('bw:scheme-change', paint);
  new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-style'] });
  paint();
})();
// 둘째 카드 파이 — 디스플레이 비중이 최소(44%)와 최대(73%) 사이를 오가고, 큰 숫자도 같이 바뀐다(2026-10-20).
// 화면에 보일 때만 돈다. 움직임 줄이기를 켜면 멈춘 채 44~73을 보인다. 화면 낭독기에는 고정 문구(44~73%)만 읽힌다.
(() => {
  document.querySelectorAll('[data-pie-anim]').forEach(svg => {
    const from = Number(svg.dataset.from), to = Number(svg.dataset.to);
    const key = svg.querySelector('[data-pie-part="key"]');
    const rest = svg.querySelector('[data-pie-part="rest"]');
    const num = svg.closest('.ov-flip-visual')?.querySelector('[data-pie-num]');
    const R = 64, C = 70;
    const at = pct => { const a = pct / 100 * 2 * Math.PI; return [C + R * Math.sin(a), C - R * Math.cos(a)]; };
    const arc = (p0, p1) => {
      const [x0, y0] = at(p0), [x1, y1] = at(p1);
      return `M${C},${C} L${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 ${p1 - p0 > 50 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`;
    };
    const draw = pct => {
      key.setAttribute('d', arc(0, pct));
      rest.setAttribute('d', arc(pct, 100));
      if (num) num.textContent = String(Math.round(pct));
    };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const PERIOD = 5000;   // 44 → 73 → 44, 끝마다 잠깐 멈춘다
    let raf = 0, start = 0, visible = false;
    const frame = now => {
      if (!start) start = now;
      const t = ((now - start) % PERIOD) / PERIOD;              // 0~1
      const tri = t < 0.5 ? t * 2 : (1 - t) * 2;                 // 0 → 1 → 0
      const hold = Math.min(1, Math.max(0, (tri - 0.1) / 0.8));  // 양끝에서 멈춤
      const ease = hold < 0.5 ? 2 * hold * hold : 1 - (-2 * hold + 2) ** 2 / 2;
      draw(from + (to - from) * ease);
      raf = requestAnimationFrame(frame);
    };
    const sync = () => {
      cancelAnimationFrame(raf); raf = 0; start = 0;
      if (reduce.matches) { draw(from); if (num) num.textContent = `${from}~${to}`; return; }
      if (visible && !document.hidden) raf = requestAnimationFrame(frame); else draw(from);
    };
    if (typeof IntersectionObserver === 'function') {
      new IntersectionObserver(entries => { visible = entries.some(e => e.isIntersecting); sync(); }).observe(svg);
    } else visible = true;
    reduce.addEventListener?.('change', sync);
    document.addEventListener('visibilitychange', sync);
    sync();
  });
})();

document.querySelectorAll('.ov-flip').forEach(card => {
  const toggle = () => card.toggleAttribute('data-flipped');
  card.addEventListener('click', () => { if (!matchMedia('(hover: hover)').matches) toggle(); });
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); }
    else if (event.key === 'Escape') card.removeAttribute('data-flipped');
  });
  card.addEventListener('blur', () => card.removeAttribute('data-flipped'));
});

// ─── Overview: 여덟 색 사이의 색(2026-11-17) — RGB 상자의 여덟 모서리(실측 색)와 고른 색의 위치, 모서리별 섞이는 비율 ───
// 값은 Overview의 다른 칸처럼 흰색 = 100으로 보이고, 계산기와 같은 BW Index(0~1)를 옆에 적는다. 계산은 scripts/bwCube.js(단위 테스트).
(() => {
  const root = document.querySelector('[data-bw-cube]');
  if (!root) return;
  const svg = root.querySelector('.ov-mix-cube');
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const box = { size: 150, x: 78, y: 262 };
  const make = (name, attrs, text) => {
    const node = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (text != null) node.textContent = text;
    return svg.appendChild(node);
  };
  const at = on => cubePoint(on[0], on[1], on[2], box);
  // 모서리 열두 개 — 꼭짓점 둘의 켜진 소자가 하나만 다르면 이웃이다. 파랑 꼭짓점에 닿는 세 모서리는 상자 뒤쪽이라 점선.
  CUBE_VERTICES.forEach((a, i) => CUBE_VERTICES.slice(i + 1).forEach(b => {
    if (a.on.filter((lit, axis) => lit !== b.on[axis]).length !== 1) return;
    const [x1, y1] = at(a.on), [x2, y2] = at(b.on);
    const back = [a, b].some(v => v.key === 'blue');
    make('line', { x1, y1, x2, y2, class: back ? 'is-edge is-back' : 'is-edge' });
  }));
  const links = CUBE_VERTICES.map(() => make('line', { class: 'is-link' }));
  const dots = CUBE_VERTICES.map(v => {
    const [cx, cy] = at(v.on);
    const dot = make('circle', { cx, cy, r: 6, class: 'is-vertex', fill: `rgb(${v.on.map(lit => lit * 255).join(', ')})` });
    const right = v.on[0] === 1;
    const x = cx + (right ? 14 : -14), anchor = right ? 'start' : 'end';
    make('text', { x, y: cy - 1, 'text-anchor': anchor }, v.name);
    make('text', { x, y: cy + 13, 'text-anchor': anchor, class: 'is-value' }, Math.round(v.value * 100));
    return dot;
  });
  const [ax, ay] = at([0.5, 0, 0]), [gx, gy] = at([0, 0.5, 0]), [bx, by] = at([1, 0, 0.5]);
  make('text', { x: ax, y: ay + 18, 'text-anchor': 'middle', class: 'is-axis' }, 'R →');
  make('text', { x: gx - 10, y: gy, 'text-anchor': 'end', class: 'is-axis' }, 'G ↑');
  make('text', { x: bx + 10, y: by + 14, class: 'is-axis' }, 'B ↗');
  const point = make('circle', { r: 9, class: 'is-point' });

  const list = root.querySelector('.ov-mix-weights');
  const rows = CUBE_VERTICES.map(v => {
    const row = document.createElement('li');
    row.className = 'ov-bw-row';
    row.innerHTML = `<span class="ov-bw-name"><span class="ov-bw-chip" style="background: rgb(${v.on.map(lit => lit * 255).join(', ')})" aria-hidden="true"></span>${v.name}</span><span class="ov-bw-track" aria-hidden="true"><span class="ov-bw-bar"></span></span><span class="ov-bw-value"></span>`;
    list.appendChild(row);
    return { bar: row.querySelector('.ov-bw-bar'), value: row.querySelector('.ov-bw-value') };
  });

  const inputs = [...root.querySelectorAll('[data-cube-axis]')];
  const swatch = root.querySelector('.ov-mix-swatch');
  const out = root.querySelector('[data-cube-value]');
  const outBw = root.querySelector('[data-cube-bw]');
  const render = () => {
    const rgb = inputs.map(input => Number(input.value));
    inputs.forEach((input, axis) => { input.nextElementSibling.textContent = rgb[axis]; });
    const weights = cubeWeights(rgb[0], rgb[1], rgb[2]);
    const mixed = weights.reduce((sum, w, i) => sum + w * CUBE_VERTICES[i].value, 0);
    const [px, py] = cubePoint(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, box);
    const color = `rgb(${rgb.join(', ')})`;
    point.setAttribute('cx', px); point.setAttribute('cy', py); point.setAttribute('fill', color);
    swatch.style.background = color;
    out.textContent = Math.round(mixed * 100);
    outBw.textContent = mixed.toFixed(2);
    weights.forEach((w, i) => {
      const [vx, vy] = at(CUBE_VERTICES[i].on);
      const link = links[i];
      link.setAttribute('x1', px); link.setAttribute('y1', py); link.setAttribute('x2', vx); link.setAttribute('y2', vy);
      link.setAttribute('stroke-width', (0.5 + w * 4).toFixed(2));
      link.setAttribute('opacity', Math.min(1, w * 1.6).toFixed(2));
      dots[i].setAttribute('r', (5 + w * 7).toFixed(1));
      rows[i].bar.style.setProperty('--v', w.toFixed(3));
      rows[i].value.textContent = `${Math.round(w * 100)}% × ${Math.round(CUBE_VERTICES[i].value * 100)}`;
    });
  };
  inputs.forEach(input => input.addEventListener('input', render));
  // '지금 Primary'는 계산기에서 고른 Primary 색을 읽어 온다 — Overview 히어로의 바탕이 그 색이다.
  const currentPrimary = () => {
    const hero = document.querySelector('.ov-hero');
    const parts = hero && getComputedStyle(hero).backgroundColor.match(/[\d.]+/g);
    return parts && parts.length >= 3 ? parts.slice(0, 3).map(Number) : [152, 39, 22];
  };
  const show = rgb => { inputs.forEach((input, axis) => { input.value = Math.round(rgb[axis]); }); render(); };
  root.querySelectorAll('[data-cube-preset]').forEach(button => button.addEventListener('click', () => {
    const preset = button.dataset.cubePreset;
    show(preset === 'primary' ? currentPrimary() : preset.split(',').map(Number));
  }));
  show(currentPrimary());
})();

// ─── Styles › Icons: Material Symbols 카탈로그(Google Fonts) ───
// fonts.google.com/icons처럼 필터(Style · Fill · Weight · Grade · Optical size)가 격자 전체에 적용된다.
// 기본 변형(Outlined · 0 · 400 · 0 · 24)은 scripts/material-symbols.js(1.6MB)에 실려 있고 페이지가 화면에 들어올 때 한 번 불러온다.
// 다른 조합은 화면에 보이는 아이콘만 공식 저장소(raw.githubusercontent.com)에서 받아 캐시한다 — 오프라인이면 기본 글리프로 둔다.
(() => {
  const root = document.querySelector('[data-icon-catalog]');
  if (!root) return;
  const PAGE = 240;
  const KEY = 'bw-icon-catalog';
  const CHECK = 'M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z';
  const view = { query: '', category: 'all', ...ICON_DEFAULTS };
  loadView(KEY, view);
  const grid = root.querySelector('[data-icon-grid]');
  const count = root.querySelector('[data-icon-count]');
  const more = root.querySelector('[data-icon-more]');
  const search = document.querySelector('[data-icon-search]'); // 메뉴가 페이지 제목 옆으로 옮긴다
  const cats = document.querySelector('[data-icon-cats]');   // 필터는 페이지 아일랜드로 옮겨진다
  const weight = document.querySelector('input[data-icon-axis="weight"]');
  const weightOut = document.querySelector('[data-icon-weight-out]');
  const fill = document.querySelector('input[data-icon-axis="fill"]');
  const cache = new Map();          // url → path | null(실패)
  let data = null;
  let limit = PAGE;
  let renderToken = 0;
  let failed = false;
  const save = () => saveView(KEY, view);
  const axes = () => ({ style: view.style, fill: view.fill, weight: view.weight, grade: view.grade, size: view.size });

  const chip = (label, value) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'm3-chip';
    button.dataset.type = 'filter';
    button.dataset.value = String(value);
    button.innerHTML = `<svg class="icon icon-symbol m3-chip-lead m3-chip-check" viewBox="0 -960 960 960" aria-hidden="true"><path d="${CHECK}"/></svg><span class="m3-chip-label"></span>`;
    button.querySelector('.m3-chip-label').textContent = label;
    return button;
  };

  const syncControls = () => {
    cats.querySelectorAll('.m3-chip').forEach(button => {
      const on = button.dataset.value === String(view.category);
      button.setAttribute('aria-pressed', String(on));
      button.toggleAttribute('data-lead', on);
    });
    document.querySelectorAll('.btn-group-connected[data-icon-axis]').forEach(group => markRadios(group, String(view[group.dataset.iconAxis])));
    fill.checked = view.fill === 1;
    weight.value = String(view.weight);
    weight.style.setProperty('--range-percent', `${((view.weight - 100) / 600) * 100}%`);
    weightOut.textContent = String(view.weight);
    grid.style.setProperty('--icon-size', `${view.size}px`);
  };

  const setCount = total => {
    count.textContent = `${total.toLocaleString('en-US')} icons${failed ? ' · 변형을 불러오지 못해 기본 모양으로 표시' : ''}`;
  };

  /** 화면에 있는 아이콘의 경로를 현재 축 조합으로 바꾼다(동시 16개). */
  async function applyVariant(cells, token) {
    const current = axes();
    if (isDefaultVariant(current)) return;
    const queue = [...cells];
    const worker = async () => {
      while (queue.length && token === renderToken) {
        const cell = queue.shift();
        const url = iconVariantUrl(cell.dataset.name, current);
        if (!cache.has(url)) {
          try {
            const response = await fetch(url);
            const text = response.ok ? await response.text() : '';
            cache.set(url, text.match(/<path d="([^"]+)"/)?.[1] || null);
          } catch (error) {
            cache.set(url, null);
          }
        }
        const path = cache.get(url);
        if (token !== renderToken) return;
        if (path) cell.querySelector('path').setAttribute('d', path);
        else failed = true;
        cell.classList.remove('is-loading');
      }
    };
    await Promise.all(Array.from({ length: 16 }, worker));
  }

  const render = () => {
    if (!data) return;
    renderToken += 1;
    failed = false;
    const token = renderToken;
    const variant = !isDefaultVariant(axes());
    const matches = filterIcons(data.icons, { query: view.query, category: view.category });
    const cells = matches.slice(0, limit).map(([name, , path]) => {
      const li = document.createElement('li');
      li.className = variant ? 'm3-icon-cell is-loading' : 'm3-icon-cell';
      li.title = name;
      li.dataset.name = name;
      const url = variant ? iconVariantUrl(name, axes()) : null;
      const shown = (url && cache.get(url)) || path;
      if (url && cache.get(url)) li.classList.remove('is-loading');
      li.innerHTML = `<svg class="icon icon-symbol" viewBox="0 -960 960 960" aria-hidden="true"><path d="${shown}"/></svg><span class="m3-icon-name"></span>`;
      li.lastChild.textContent = name;
      return li;
    });
    grid.replaceChildren(...cells);
    more.hidden = matches.length <= limit;
    setCount(matches.length);
    applyVariant(cells.filter(cell => cell.classList.contains('is-loading')), token).then(() => {
      if (token === renderToken) setCount(matches.length);
    });
  };

  const build = () => {
    data = window.MATERIAL_SYMBOLS;
    if (!data) return;
    const counts = countByCategory(data.icons, data.categories.length);
    cats.replaceChildren(chip(`All ${data.icons.length.toLocaleString('en-US')}`, 'all'),
      ...data.categories.map((name, index) => chip(`${name} ${counts[index]}`, index)));
    if (view.category !== 'all' && !(view.category >= 0 && view.category < data.categories.length)) view.category = 'all';
    search.value = view.query;
    syncControls();
    render();
  };

  let requested = false;
  const load = () => {
    if (requested) return;
    requested = true;
    count.textContent = 'Loading…';
    const script = document.createElement('script');
    script.src = 'scripts/material-symbols.js';
    script.onload = build;
    script.onerror = () => { count.textContent = '아이콘 데이터를 불러오지 못했습니다.'; };
    document.head.append(script);
  };

  const update = () => { limit = PAGE; save(); syncControls(); render(); };
  search.addEventListener('input', () => { view.query = search.value; limit = PAGE; save(); render(); });
  cats.addEventListener('click', event => {
    const button = event.target.closest('.m3-chip');
    if (!button) return;
    view.category = button.dataset.value === 'all' ? 'all' : Number(button.dataset.value);
    update();
  });
  // Style · Grade · Optical size — 연결 버튼 그룹(방향키 이동은 공통 라디오 그룹 처리가 한다)
  document.querySelectorAll('.btn-group-connected[data-icon-axis]').forEach(group => {
    const choose = () => {
      const checked = group.querySelector('[role="radio"][aria-checked="true"]');
      if (!checked) return;
      const axis = group.dataset.iconAxis;
      const value = axis === 'style' ? checked.dataset.value : Number(checked.dataset.value);
      if (view[axis] === value) return;
      view[axis] = value;
      update();
    };
    group.addEventListener('click', () => requestAnimationFrame(choose));
    group.addEventListener('keydown', () => requestAnimationFrame(choose));
  });
  fill.addEventListener('change', () => { view.fill = fill.checked ? 1 : 0; update(); });
  weight.addEventListener('input', () => {
    view.weight = Number(weight.value);
    syncControls();
  });
  weight.addEventListener('change', () => { view.weight = Number(weight.value); update(); });
  more.addEventListener('click', () => {
    const first = grid.children.length;
    limit += PAGE;
    render();
    grid.children[first]?.setAttribute('tabindex', '-1');
    grid.children[first]?.focus({ preventScroll: true });
  });

  syncControls();
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); load(); }
    });
    observer.observe(root);
  } else {
    load();
  }
})();

// ─── Styles › Shape: Corner radius scale Live — 단계와 적용할 모서리를 골라 비대칭 모양을 만든다 ───
(() => {
  const range = document.querySelector('[data-shape-style]');
  const out = document.querySelector('[data-shape-out]');
  const set = document.querySelector('[data-shape-corners]');
  const live = document.querySelector('[data-shape-live]');
  if (!range || !out || !set || !live) return;
  const SCALE = [['none', 'None', '0dp'], ['xs', 'Extra small', '4dp'], ['sm', 'Small', '8dp'], ['md', 'Medium', '12dp'], ['lg', 'Large', '16dp'],
    ['lg-increased', 'Large increased', '20dp'], ['xl', 'Extra large', '28dp'], ['xl-increased', 'Extra large increased', '32dp'], ['xxl', 'Extra extra large', '48dp'], ['full', 'Full', 'Fully rounded']];
  const CORNERS = [['start-start', 'Top start'], ['start-end', 'Top end'], ['end-end', 'Bottom end'], ['end-start', 'Bottom start']];
  const CHECK = 'M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z';
  const KEY = 'bw-shape-live';
  const view = { step: 3, corners: CORNERS.map(c => c[0]) };
  loadView(KEY, view);
  const save = () => saveView(KEY, view);
  for (const [key, label] of CORNERS) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'm3-chip';
    chip.dataset.type = 'filter';
    chip.dataset.corner = key;
    chip.innerHTML = `<svg class="icon icon-symbol m3-chip-lead m3-chip-check" viewBox="0 -960 960 960" aria-hidden="true"><path d="${CHECK}"/></svg><span class="m3-chip-label">${label}</span>`;
    set.append(chip);
  }
  const apply = () => {
    const [token, name, value] = SCALE[view.step] || SCALE[3];
    range.value = String(view.step);
    range.style.setProperty('--range-percent', `${(view.step / 9) * 100}%`);
    range.setAttribute('aria-valuetext', `${name} ${value}`);
    out.textContent = `${name} · ${value}`;
    for (const [key] of CORNERS) {
      live.style.setProperty(`border-${key}-radius`, view.corners.includes(key) ? `var(--md-shape-${token})` : '0');
    }
    set.querySelectorAll('.m3-chip').forEach(chip => {
      const on = view.corners.includes(chip.dataset.corner);
      chip.setAttribute('aria-pressed', String(on));
      chip.toggleAttribute('data-lead', on);
    });
  };
  range.addEventListener('input', () => { view.step = Number(range.value); save(); apply(); });
  set.addEventListener('click', event => {
    const chip = event.target.closest('.m3-chip');
    if (!chip) return;
    const key = chip.dataset.corner;
    view.corners = view.corners.includes(key) ? view.corners.filter(c => c !== key) : [...view.corners, key];
    save();
    apply();
  });
  apply();
})();

// ─── Styles › Spacing Live — Search 여백(포커스 시 24 → 12dp) · 글자 200%에서도 여백 유지 ───
(() => {
  const KEY = 'bw-spacing-live';
  const view = { focused: false, scale: 100 };
  loadView(KEY, view);
  const save = () => saveView(KEY, view);
  const focus = document.querySelector('[data-space-focus]');
  const screen = document.querySelector('[data-space-screen]');
  const focusOut = document.querySelector('[data-space-focus-out]');
  const range = document.querySelector('[data-space-scale]');
  const list = document.querySelector('[data-space-list]');
  const scaleOut = document.querySelector('[data-space-scale-out]');
  const px = el => Math.round(parseFloat(getComputedStyle(el).paddingTop));
  const apply = () => {
    if (focus && screen) {
      focus.checked = view.focused;
      screen.toggleAttribute('data-focused', view.focused);
      focusOut.textContent = `Margin ${view.focused ? 12 : 24}dp · padding 8dp · gap 8dp`;
    }
    if (range && list) {
      range.value = String(view.scale);
      range.style.setProperty('--range-percent', `${view.scale - 100}%`);
      list.style.setProperty('--scale', String(view.scale / 100));
      scaleOut.textContent = `${view.scale}% · padding ${px(list)}dp`;
    }
  };
  focus?.addEventListener('change', () => { view.focused = focus.checked; save(); apply(); });
  range?.addEventListener('input', () => { view.scale = Number(range.value); save(); apply(); });
  apply();
})();

// ─── Styles › Typography (m3.material.io/styles/typography) ───
// Type scale: Configurations는 기본 15 · 강조 15단계를 역할별 줄로, Live는 역할 · 크기 · 강조 · 글자를 골라 본다.
// Applying type Live: 비례 숫자와 고정폭(tabular) 숫자의 폭 흔들림. 값은 scripts/typeScale.js · tokens.css.
(() => {
  const config = document.querySelector('[data-type-config]');
  if (config) {
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
    const cap = text => text[0].toUpperCase() + text.slice(1);
    for (const emphasized of [false, true]) {
      for (const role of TYPE_ROLES) {
        const label = emphasized ? `Emphasized ${role}` : cap(role);
        const r = el('div', 'btn-spec-row m3-type-row');
        r.append(el('span', 'btn-spec-label', label));
        const list = el('ul', 'm3-type-tiles');
        list.setAttribute('aria-label', label);
        for (const size of TYPE_SIZES) {
          const token = typeToken(role, size, emphasized);
          const tile = el('li', 'm3-type-tile');
          const sample = el('span', 'm3-type-sample', '가Aa');
          sample.style.font = `var(${token})`;
          sample.style.letterSpacing = `var(${token}-tracking)`;
          tile.append(sample, el('span', 'm3-type-name', cap(size)), el('span', 'm3-type-meta', typeMeta(role, size, emphasized)));
          list.append(tile);
        }
        r.append(list);
        config.append(r);
      }
    }
  }

  const KEY = 'bw-typography-live';
  const view = { role: 'body', size: 'large', emphasized: false, text: '', tabular: false, value: 671 };
  loadView(KEY, view);
  const save = () => saveView(KEY, view);

  const live = document.querySelector('[data-type-live]');
  const out = document.querySelector('[data-type-out]');
  const text = document.querySelector('[data-type-text]');
  const emph = document.querySelector('[data-type-emphasized]');
  const groups = [...document.querySelectorAll('.btn-group-connected[data-type-axis]')];
  const syncGroups = () => groups.forEach(group => {
    group.querySelectorAll('[role="radio"]').forEach(button => {
      const on = button.dataset.value === view[group.dataset.typeAxis];
      button.setAttribute('aria-checked', String(on));
      button.tabIndex = on ? 0 : -1;
    });
  });
  const renderScale = () => {
    if (!live) return;
    const token = typeToken(view.role, view.size, view.emphasized);
    live.style.font = `var(${token})`;
    live.style.letterSpacing = `var(${token}-tracking)`;
    live.textContent = view.text || text?.defaultValue || '';
    out.textContent = `${typeName(view.role, view.size, view.emphasized)} · ${typeMeta(view.role, view.size, view.emphasized)}`;
  };
  // 공통 단일 선택 처리(클릭 · 방향키)가 aria-checked를 먼저 바꾼 뒤 여기서 읽는다.
  groups.forEach(group => {
    const read = () => {
      const checked = group.querySelector('[role="radio"][aria-checked="true"]');
      if (!checked || checked.dataset.value === view[group.dataset.typeAxis]) return;
      view[group.dataset.typeAxis] = checked.dataset.value;
      save(); renderScale();
    };
    group.addEventListener('click', read);
    group.addEventListener('keydown', read);
  });
  emph?.addEventListener('change', () => { view.emphasized = emph.checked; save(); renderScale(); });
  text?.addEventListener('input', () => { view.text = text.value; save(); renderScale(); });
  if (text && view.text) text.value = view.text;
  if (emph) emph.checked = view.emphasized;
  syncGroups();
  renderScale();

  const tabular = document.querySelector('[data-type-tabular]');
  const range = document.querySelector('[data-type-value]');
  const clock = document.querySelector('[data-type-clock]');
  const widthOut = document.querySelector('[data-type-width-out]');
  const renderClock = () => {
    if (!clock) return;
    const mm = String(Math.floor(view.value / 60)).padStart(2, '0');
    const ss = String(view.value % 60).padStart(2, '0');
    tabular.checked = view.tabular;
    range.value = String(view.value);
    range.style.setProperty('--range-percent', `${(view.value / 3599) * 100}%`);
    clock.toggleAttribute('data-tabular', view.tabular);
    clock.textContent = `${mm}:${ss}`;
    widthOut.textContent = `${mm}:${ss} · ${Math.round(clock.getBoundingClientRect().width)}px`;
  };
  tabular?.addEventListener('change', () => { view.tabular = tabular.checked; save(); renderClock(); });
  range?.addEventListener('input', () => { view.value = Number(range.value); save(); renderClock(); });
  renderClock();
  // 숨은 패널에서는 폭이 0으로 잡히므로 Styles 메뉴에서 Typography를 열 때 다시 잰다.
  const item = document.getElementById('typography-applying-type');
  if (item && 'IntersectionObserver' in window) new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) renderClock(); }).observe(item);
})();

// ─── Styles › States (m3.material.io/foundations/interaction/states) ───
// State layers: 컨테이너 짝 3종 × 5상태 표, Live는 짝 · 상태를 골라 레이어 색과 대비를 본다.
// Applying states Live: 실제 포인터 · 키보드로 hover · focus · pressed · dragged, 비활성 스위치. 값은 scripts/states.js · tokens.css.
(() => {
  const PAIRS = [
    { id: 'surface', label: 'Surface · primary', name: 'Surface', c: '--surface', o: '--primary-on-bg', oName: 'primary' },
    { id: 'secondary-container', label: 'Secondary container', name: 'Secondary container', c: '--secondary-container', o: '--on-secondary-container', oName: 'on-secondary-container' },
    { id: 'primary', label: 'Primary', name: 'Primary', c: '--primary', o: '--on-primary', oName: 'on-primary' },
  ];
  const TOKEN = { enabled: '0%', hover: 'var(--md-state-hover)', focus: 'var(--md-state-focus)', pressed: 'var(--md-state-pressed)', dragged: 'var(--md-state-dragged)' };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
  const paint = (node, pair, state) => {
    node.dataset.pair = pair.id;
    node.style.setProperty('--c', `var(${pair.c})`);
    node.style.setProperty('--o', `var(${pair.o})`);
    node.style.setProperty('--p', TOKEN[state]);
    node.classList.toggle('m3-state-ring-out', state === 'focus');
  };

  const config = document.querySelector('[data-state-config]');
  if (config) {
    for (const pair of PAIRS) {
      const r = el('div', 'btn-spec-row m3-state-row');
      r.append(el('span', 'btn-spec-label', pair.label));
      const list = el('ul', 'm3-state-tiles');
      list.setAttribute('aria-label', pair.label);
      for (const state of Object.keys(STATE_LAYER_OPACITY)) {
        const tile = el('li', 'm3-state-tile');
        const box = el('span', 'm3-state-box', 'Label');
        box.setAttribute('aria-hidden', 'true');
        paint(box, pair, state);
        tile.append(box, el('span', 'm3-state-name', STATE_NAMES[state]), el('span', 'm3-state-meta', `${Math.round(STATE_LAYER_OPACITY[state] * 100)}%${state === 'focus' ? ' · ring' : ''}`));
        list.append(tile);
      }
      r.append(list);
      config.append(r);
    }
    const r = el('div', 'btn-spec-row m3-state-row');
    r.append(el('span', 'btn-spec-label', 'Target size'));
    const list = el('ul', 'm3-state-tiles');
    list.setAttribute('aria-label', 'Target size');
    const tile = el('li', 'm3-state-tile');
    const target = el('span', 'm3-state-target-size');
    target.setAttribute('aria-hidden', 'true');
    target.innerHTML = '<span><svg class="icon icon-symbol" viewBox="0 -960 960 960"><path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z"/></svg></span>';
    tile.append(target, el('span', 'm3-state-name', 'Icon button'), el('span', 'm3-state-meta', 'Layer 40dp · target 48dp'));
    list.append(tile);
    r.append(list);
    config.append(r);
  }

  const KEY = 'bw-states-live';
  const view = { pair: 'secondary-container', state: 'hover', disabled: false };
  loadView(KEY, view);
  const save = () => saveView(KEY, view);

  const live = document.querySelector('[data-state-live]');
  const out = document.querySelector('[data-state-out]');
  const groups = [...document.querySelectorAll('.btn-group-connected[data-state-axis]')];
  let probe;
  const renderLayer = () => {
    if (!live) return;
    const pair = PAIRS.find(p => p.id === view.pair) || PAIRS[1];
    paint(live, pair, view.state);
    // 전환 중에는 계산값이 oklab 보간색이라, 전환 없는 숨은 복제본에서 최종 색을 잰다.
    if (!probe) { probe = live.cloneNode(true); probe.removeAttribute('data-state-live'); probe.style.cssText += ';transition:none;position:absolute;visibility:hidden;pointer-events:none'; live.after(probe); }
    paint(probe, pair, view.state);
    const cs = getComputedStyle(probe);
    const bg = parseLayerColor(cs.backgroundColor);
    const fg = parseLayerColor(cs.color);
    const ratio = bg && fg ? layerContrast(fg, bg).toFixed(2) : '–';
    out.textContent = `${pair.oName} ${Math.round(STATE_LAYER_OPACITY[view.state] * 100)}% · ${ratio}:1`;
  };
  groups.forEach(group => {
    group.querySelectorAll('[role="radio"]').forEach(button => {
      const on = button.dataset.value === view[group.dataset.stateAxis];
      button.setAttribute('aria-checked', String(on));
      button.tabIndex = on ? 0 : -1;
    });
    const read = () => {
      const checked = group.querySelector('[role="radio"][aria-checked="true"]');
      if (!checked || checked.dataset.value === view[group.dataset.stateAxis]) return;
      view[group.dataset.stateAxis] = checked.dataset.value;
      save(); renderLayer();
    };
    group.addEventListener('click', read);
    group.addEventListener('keydown', read);
  });
  renderLayer();
  // 계산기에서 모드 · 대비 · Primary를 바꾸면 역할 색이 바뀌므로 대비를 다시 잰다(배경 전환 0.3초 뒤).
  let timer;
  new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(renderLayer, 350); }).observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-style'] });

  // Applying states Live
  const disabled = document.querySelector('[data-state-disabled]');
  const button = document.querySelector('[data-state-target]');
  const card = document.querySelector('[data-state-card]');
  const track = document.querySelector('[data-state-track]');
  const now = document.querySelector('[data-state-now]');
  if (!button || !card) return;
  const flags = { button: {}, card: {} };
  let x = 0;
  const maxX = () => Math.max(0, track.clientWidth - card.offsetWidth - 16);
  const report = () => {
    const lines = [['Button', flags.button], ['Card', flags.card]].map(([name, f]) => {
      if (view.disabled) return `${name}: Disabled`;
      const s = activeState(f);
      return `${name}: ${STATE_NAMES[s]} · ${Math.round(STATE_LAYER_OPACITY[s] * 100)}%`;
    });
    now.textContent = lines.join('\n');
  };
  const setX = value => {
    x = value;
    card.style.setProperty('--x', `${x}px`);
    card.setAttribute('aria-valuenow', String(Math.round((x / (maxX() || 1)) * 100)));
  };
  const applyDisabled = () => {
    disabled.checked = view.disabled;
    button.disabled = view.disabled;
    card.setAttribute('aria-disabled', String(view.disabled));
    card.tabIndex = view.disabled ? -1 : 0;
    if (view.disabled) { flags.button = {}; flags.card = {}; card.removeAttribute('data-dragged'); }
    report();
  };
  const watch = (node, f) => {
    node.addEventListener('pointerenter', () => { f.hover = true; report(); });
    node.addEventListener('pointerleave', () => { f.hover = false; f.pressed = false; report(); });
    node.addEventListener('pointerdown', () => { f.pressed = true; report(); });
    node.addEventListener('pointerup', () => { f.pressed = false; report(); });
    node.addEventListener('focus', () => { f.focus = node.matches(':focus-visible'); report(); });
    node.addEventListener('blur', () => { f.focus = false; report(); });
  };
  watch(button, flags.button);
  watch(card, flags.card);
  button.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { flags.button.pressed = true; report(); } });
  button.addEventListener('keyup', () => { flags.button.pressed = false; report(); });
  // 끌기: 포인터를 누른 채 움직이면 dragged(16% · Level 4). 키보드는 좌우 방향키로 옮기는 동안 dragged.
  let start = null;
  card.addEventListener('pointerdown', e => {
    if (view.disabled) return;
    start = { px: e.clientX, x };
    card.setPointerCapture(e.pointerId);
  });
  card.addEventListener('pointermove', e => {
    if (!start || view.disabled) return;
    const dx = e.clientX - start.px;
    if (!flags.card.dragged && Math.abs(dx) < 4) return;
    flags.card.dragged = true;
    card.setAttribute('data-dragged', '');
    setX(dragPosition(start.x, dx, maxX()));
    report();
  });
  const drop = () => { start = null; flags.card.dragged = false; flags.card.pressed = false; card.removeAttribute('data-dragged'); report(); };
  card.addEventListener('pointerup', drop);
  card.addEventListener('pointercancel', drop);
  card.addEventListener('keydown', e => {
    if (view.disabled) return;
    const step = { ArrowRight: 24, ArrowUp: 24, ArrowLeft: -24, ArrowDown: -24 }[e.key];
    const edge = { Home: -Infinity, End: Infinity }[e.key];
    if (step === undefined && edge === undefined) return;
    e.preventDefault();
    flags.card.dragged = true;
    card.setAttribute('data-dragged', '');
    setX(edge !== undefined ? dragPosition(0, edge, maxX()) : dragPosition(x, step, maxX()));
    report();
  });
  card.addEventListener('keyup', e => { if (/^(Arrow|Home|End)/.test(e.key)) drop(); });
  disabled.addEventListener('change', () => { view.disabled = disabled.checked; save(); applyDisabled(); });
  applyDisabled();
})();

// ─── Styles › Motion (m3.material.io/styles/motion) ───
// Motion physics system(스프링) · Easing and duration(레거시) · Transitions. 값은 scripts/motion.js · tokens.css.
// 줄이는 모션 설정(prefers-reduced-motion)에서는 M3 Applying transitions대로 이동 · 크기 변화 대신 짧은 페이드로 바꾼다.
(() => {
  const physics = document.getElementById('m3-motion-physics');
  const easingHost = document.getElementById('m3-motion-easing');
  const transitions = document.getElementById('m3-motion-transitions');
  if (!physics && !easingHost && !transitions) return;
  const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'bw-motion-view';
  const view = { scheme: 'expressive', web: 'spring' };
  loadView(KEY, view);
  const save = () => saveView(KEY, view);
  const cap = text => text[0].toUpperCase() + text.slice(1);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
  const block = name => { const b = el('section', 'btn-spec-block'); b.setAttribute('aria-label', name); b.append(el('h3', 'btn-spec-heading', name)); return b; };
  const row = (label, cls = '') => {
    const r = el('div', `btn-spec-row m3-motion-row ${cls}`.trim());
    r.append(el('span', 'btn-spec-label', label));
    const list = el('ul', 'm3-motion-tiles');
    list.setAttribute('aria-label', label);
    r.append(list);
    return { r, list };
  };
  // 곡선 위 재생(2026-09-29): 가로축이 시간(0 → 지속 시간)이므로, 칸에 마우스를 올리면 점이 실제 지속 시간 동안
  // 곡선을 따라 움직이며 그 순간의 진행값을 보여 준다(세로 커서 = 지금 시각).
  // 지속 시간: 스프링 = 정착 시간, 이징 = M3 짝 지속 시간(없으면 300ms).
  const plot = (kind, value, name) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'm3-motion-plot');
    svg.setAttribute('viewBox', '0 0 96 64');
    svg.setAttribute('aria-hidden', 'true');
    // 기준선: 출발(0)과 목표(1)
    const y = v => 64 - ((v + 0.1) / 1.45) * 64;
    const d = curvePath(kind, value);
    svg.innerHTML = `<line class="m3-motion-guide" x1="0" x2="96" y1="${y(0)}" y2="${y(0)}"/><line class="m3-motion-guide" x1="0" x2="96" y1="${y(1)}" y2="${y(1)}"/><line class="m3-motion-cursor" x1="0" x2="0" y1="0" y2="64"/><path class="m3-motion-curve" d="${d}"/><circle class="m3-motion-dot" r="3.5"/>`;
    const pts = [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])]);
    const duration = kind === 'spring' ? springDuration(value) : (EASING_PAIRS.find(pair => pair.easing === name)?.duration ?? 300);
    curvePlayer.add(svg, pts, duration);
    return svg;
  };
  const tile = (list, { name, meta, graphic, button }) => {
    const li = el('li', 'm3-motion-tile-wrap');
    const t = el(button ? 'button' : 'div', 'm3-motion-tile');
    if (button) t.type = 'button';
    if (graphic) t.append(graphic);
    t.append(el('span', 'm3-motion-name', name));
    if (meta) t.append(el('span', 'm3-motion-meta', meta));
    li.append(t);
    list.append(li);
    return t;
  };
  const group = (label, axis, options) => {
    const r = el('div', 'btn-spec-row m3-motion-row');
    const id = `motion-${axis}-label`;
    const head = el('span', 'btn-spec-label', label);
    head.id = id;
    const g = el('div', 'btn-group-connected');
    g.setAttribute('role', 'radiogroup');
    g.setAttribute('aria-labelledby', id);
    g.dataset.size = 'xs';
    for (const [value, text] of options) {
      const b = el('button', 'btn btn-tonal', text);
      b.type = 'button';
      b.dataset.size = 'xs';
      b.setAttribute('role', 'radio');
      b.dataset.value = value;
      const on = view[axis] === value;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
      g.append(b);
    }
    const pick = next => {
      if (!next || view[axis] === next.dataset.value) return;
      view[axis] = next.dataset.value;
      save();
      g.querySelectorAll('[role="radio"]').forEach(b => {
        const on = b === next;
        b.setAttribute('aria-checked', String(on));
        b.tabIndex = on ? 0 : -1;
      });
      renderPhysicsLive();
    };
    g.addEventListener('click', event => pick(event.target.closest('[role="radio"]')));
    g.addEventListener('keydown', event => {
      const buttons = [...g.querySelectorAll('[role="radio"]')];
      const i = buttons.indexOf(document.activeElement);
      let n;
      if (['ArrowRight', 'ArrowDown'].includes(event.key)) n = (i + 1) % buttons.length;
      if (['ArrowLeft', 'ArrowUp'].includes(event.key)) n = (i + buttons.length - 1) % buttons.length;
      if (n === undefined) return;
      event.preventDefault();
      buttons[n].focus();
      pick(buttons[n]);
    });
    r.append(head, g);
    return r;
  };
  const springLabel = (speed, type) => `${cap(speed)} ${type}`;

  /** 점 하나를 트랙 끝으로(또는 되돌려) 움직인다. spatial = 위치, effects = 불투명도. */
  const play = (target, kind, easing, duration) => {
    const on = target.dataset.at !== 'end';
    target.dataset.at = on ? 'end' : 'start';
    if (reduce()) {
      target.animate([{ opacity: 0.38 }, { opacity: 1 }], { duration: 100, easing: 'linear' });
      target.style.transform = kind === 'spatial' && on ? 'translateX(var(--motion-travel))' : '';
      target.style.opacity = kind === 'effects' && on ? '0.12' : '';
      return;
    }
    const frames = kind === 'spatial'
      ? [{ transform: on ? 'translateX(0)' : 'translateX(var(--motion-travel))' }, { transform: on ? 'translateX(var(--motion-travel))' : 'translateX(0)' }]
      : [{ opacity: on ? 1 : 0.12 }, { opacity: on ? 0.12 : 1 }];
    let animation;
    try { animation = target.animate(frames, { duration, easing, fill: 'forwards' }); }
    catch (error) { animation = target.animate(frames, { duration, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards' }); }
    animation.onfinish = () => {
      target.style.transform = kind === 'spatial' && on ? 'translateX(var(--motion-travel))' : '';
      target.style.opacity = kind === 'effects' && on ? '0.12' : '';
      animation.cancel();
    };
  };
  const demo = kind => {
    const stage = el('span', `m3-motion-demo m3-motion-demo--${kind}`);
    stage.setAttribute('aria-hidden', 'true');
    const dot = el('span', 'm3-motion-dot');
    stage.append(dot);
    return { stage, dot };
  };

  // 1) Motion physics system
  let physicsLive = null;
  function renderPhysicsLive() {
    if (!physicsLive) return;
    physicsLive.querySelectorAll('.m3-motion-row[data-live]').forEach(r => r.remove());
    for (const type of SPRING_TYPES) {
      const { r, list } = row(cap(type));
      r.dataset.live = '';
      for (const speed of SPRING_SPEEDS) {
        const spring = SPRINGS[view.scheme][speed][type];
        const { easing, duration } = view.web === 'spring'
          ? springEasing(spring)
          : { easing: `cubic-bezier(${SPRING_CURVES[view.scheme][speed][type][0].join(', ')})`, duration: SPRING_CURVES[view.scheme][speed][type][1] };
        const { stage, dot } = demo(type);
        const t = tile(list, { name: cap(speed), meta: `${duration}ms`, graphic: stage, button: true });
        t.setAttribute('aria-label', `${cap(view.scheme)} ${speed} ${type} 재생 · ${duration}ms`);
        t.addEventListener('click', () => play(dot, type, easing, duration));
      }
      physicsLive.append(r);
    }
  }
  if (physics) {
    const conf = block('Configurations');
    for (const scheme of SPRING_SCHEMES) {
      const { r, list } = row(cap(scheme));
      for (const type of SPRING_TYPES) {
        for (const speed of SPRING_SPEEDS) {
          const spring = SPRINGS[scheme][speed][type];
          tile(list, { name: springLabel(speed, type), meta: `Stiffness ${spring.stiffness} · Damping ${spring.damping}`, graphic: plot('spring', spring) });
        }
      }
      conf.append(r);
    }
    physicsLive = block('Live');
    physicsLive.append(group('Scheme', 'scheme', [['expressive', 'Expressive'], ['standard', 'Standard']]),
      group('Web', 'web', [['spring', 'Spring'], ['curve', 'Curve']]));
    physics.replaceChildren(conf, physicsLive);
    renderPhysicsLive();
  }

  // 2) Easing and duration
  if (easingHost) {
    const conf = block('Configurations');
    const sets = [
      ['Emphasized', [['emphasized', 'Emphasized'], ['emphasized-decelerate', 'Emphasized decelerate'], ['emphasized-accelerate', 'Emphasized accelerate']]],
      ['Standard', [['standard', 'Standard'], ['standard-decelerate', 'Standard decelerate'], ['standard-accelerate', 'Standard accelerate']]],
      ['Legacy', [['legacy', 'Legacy'], ['legacy-decelerate', 'Legacy decelerate'], ['legacy-accelerate', 'Legacy accelerate'], ['linear', 'Linear']]],
    ];
    for (const [label, items] of sets) {
      const { r, list } = row(label);
      for (const [name, text] of items) {
        tile(list, { name: text, meta: name === 'emphasized' ? 'Path · linear()' : `cubic-bezier(${EASINGS[name].join(', ')})`, graphic: plot(name === 'emphasized' ? 'path' : 'bezier', EASINGS[name], name) });
      }
      conf.append(r);
    }
    for (const [groupName, values] of Object.entries(DURATIONS)) {
      const label = groupName === 'extra-long' ? 'Extra long' : cap(groupName);
      const { r, list } = row(label, 'm3-motion-durations');
      values.forEach((ms, i) => {
        const bar = el('span', 'm3-motion-bar');
        bar.style.setProperty('--ms', ms);
        bar.setAttribute('aria-hidden', 'true');
        tile(list, { name: `${groupName}${i + 1}`, meta: `${ms}ms`, graphic: bar });
      });
      conf.append(r);
    }
    const live = block('Live');
    const { r, list } = row('Suggested pairs');
    for (const pair of EASING_PAIRS) {
      const { stage, dot } = demo('spatial');
      const name = cap(pair.easing.replace(/-/g, ' '));
      const t = tile(list, { name: `${name} · ${pair.duration}ms`, meta: pair.type, graphic: stage, button: true });
      t.addEventListener('click', () => play(dot, 'spatial', cssEasing(pair.easing), pair.duration));
    }
    live.append(r);
    easingHost.replaceChildren(conf, live);
  }

  // 3) Transitions — 두 화면(A · B) 사이를 여섯 패턴으로 오간다. 레거시 이징 · 지속 시간(사이트 Transitions 주의문).
  if (transitions) {
    const live = block('Live');
    const controls = el('div', 'btn-spec-row m3-motion-row');
    controls.append(el('span', 'btn-spec-label', 'Pattern'));
    const buttons = el('div', 'm3-motion-patterns');
    const stageRow = el('div', 'btn-spec-row m3-motion-row');
    stageRow.append(el('span', 'btn-spec-label', 'Preview'));
    const stage = el('div', 'm3-motion-stage');
    stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML = `<div class="m3-motion-screen" data-screen="a"><span class="m3-motion-bar-top"></span><span class="m3-motion-line"></span><span class="m3-motion-line"></span><span class="m3-motion-card"></span><span class="m3-motion-line m3-motion-line--short"></span></div>
      <div class="m3-motion-screen" data-screen="b" hidden><span class="m3-motion-bar-top m3-motion-bar-top--b"></span><span class="m3-motion-hero"></span><span class="m3-motion-line"></span><span class="m3-motion-line m3-motion-line--short"></span></div>
      <div class="m3-motion-sheet" hidden><span class="m3-motion-handle"></span><span class="m3-motion-line"></span><span class="m3-motion-line m3-motion-line--short"></span></div>
      <div class="m3-motion-skeleton" hidden><span class="m3-motion-bone m3-motion-bone--wide"></span><span class="m3-motion-bone"></span><span class="m3-motion-bone m3-motion-bone--block"></span><span class="m3-motion-bone m3-motion-bone--short"></span></div>
      <div class="m3-motion-container" hidden></div>`;
    stageRow.append(stage);
    const $ = sel => stage.querySelector(sel);
    const A = $('[data-screen="a"]'), B = $('[data-screen="b"]'), sheet = $('.m3-motion-sheet'), skeleton = $('.m3-motion-skeleton'), container = $('.m3-motion-container');
    let busy = false;
    const E = name => cssEasing(name);
    const run = (node, frames, duration, easing, delay = 0) => node.animate(frames, { duration, easing, delay, fill: 'both' }).finished;
    const current = () => (B.hidden ? A : B);
    const other = () => (B.hidden ? B : A);
    const swap = () => { const [from, to] = [current(), other()]; to.hidden = false; return [from, to]; };
    const settle = (...nodes) => nodes.forEach(n => n.getAnimations().forEach(a => a.cancel()));
    const fadeOnly = async () => { // 줄이는 모션: 짧은 페이드
      const [from, to] = swap();
      await run(from, [{ opacity: 1 }, { opacity: 0 }], 100, 'linear');
      from.hidden = true;
      await run(to, [{ opacity: 0 }, { opacity: 1 }], 150, 'linear');
      settle(from, to);
    };
    const PATTERNS = {
      'Container transform': async () => {
        const toB = B.hidden;
        const card = $('.m3-motion-card');
        const s = stage.getBoundingClientRect(), c = card.getBoundingClientRect();
        const small = { left: `${c.left - s.left}px`, top: `${c.top - s.top}px`, width: `${c.width}px`, height: `${c.height}px`, borderRadius: getComputedStyle(card).borderTopLeftRadius };
        const full = { left: '0px', top: '0px', width: `${s.width}px`, height: `${s.height}px`, borderRadius: '0px' };
        container.hidden = false;
        await run(container, toB ? [small, full] : [full, small], 500, E('emphasized'));
        if (toB) { B.hidden = false; A.hidden = true; } else { A.hidden = false; B.hidden = true; }
        await run(toB ? B : A, [{ opacity: 0 }, { opacity: 1 }], 100, 'linear');
        container.hidden = true;
        settle(container, A, B);
      },
      'Forward and backward': async () => {
        const forward = B.hidden;
        const [from, to] = swap();
        const dir = forward ? 1 : -1;
        await Promise.all([
          run(from, [{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${-30 * dir}%)`, opacity: 0 }], 300, E('standard')),
          run(to, [{ transform: `translateX(${30 * dir}%)`, opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], 300, E('standard')),
        ]);
        from.hidden = true;
        settle(from, to);
      },
      Lateral: async () => {
        const [from, to] = swap();
        await Promise.all([
          run(from, [{ transform: 'translateX(0)' }, { transform: 'translateX(-100%)' }], 500, E('emphasized')),
          run(to, [{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], 500, E('emphasized')),
        ]);
        from.hidden = true;
        settle(from, to);
      },
      'Top level': async () => {
        const [from, to] = swap();
        to.style.opacity = '0';
        await run(from, [{ opacity: 1 }, { opacity: 0 }], 200, E('emphasized-accelerate'));
        from.hidden = true;
        to.style.opacity = '';
        await run(to, [{ opacity: 0 }, { opacity: 1 }], 250, E('standard-decelerate'));
        settle(from, to);
      },
      'Enter and exit': async () => {
        if (sheet.hidden) {
          sheet.hidden = false;
          await run(sheet, [{ clipPath: 'inset(100% 0 0 0 round var(--md-shape-xl) var(--md-shape-xl) 0 0)' }, { clipPath: 'inset(0 0 0 0 round var(--md-shape-xl) var(--md-shape-xl) 0 0)' }], 400, E('emphasized-decelerate'));
          settle(sheet);
        } else {
          await run(sheet, [{ clipPath: 'inset(0 0 0 0 round var(--md-shape-xl) var(--md-shape-xl) 0 0)' }, { clipPath: 'inset(100% 0 0 0 round var(--md-shape-xl) var(--md-shape-xl) 0 0)' }], 200, E('emphasized-accelerate'));
          sheet.hidden = true;
          settle(sheet);
        }
      },
      'Skeleton loaders': async () => {
        const target = current();
        target.hidden = true;
        skeleton.hidden = false;
        await run(skeleton, [{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], 1000, E('standard'));
        await run(skeleton, [{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], 1000, E('standard'));
        target.hidden = false;
        await run(target, [{ opacity: 0 }, { opacity: 1 }], 150, E('standard'));
        skeleton.hidden = true;
        settle(skeleton, target);
      },
    };
    for (const name of Object.keys(PATTERNS)) {
      const b = el('button', 'btn btn-tonal', name);
      b.type = 'button';
      b.dataset.size = 'xs';
      b.addEventListener('click', async () => {
        if (busy) return;
        busy = true;
        try {
          if (reduce() && name !== 'Enter and exit') await fadeOnly();
          else if (reduce()) { sheet.hidden = !sheet.hidden; }
          else await PATTERNS[name]();
        } finally { busy = false; }
      });
      buttons.append(b);
    }
    controls.append(buttons);
    live.append(controls, stageRow);
    transitions.replaceChildren(live);
  }
})();

// ─── Actions 보기 전환: 크기 · 형태 · 색 · 아이콘 ───
// 상단 컨트롤 바에서 고른 값을 data-view-target 항목 안의 버튼 전체에 적용한다.
(() => {
  const section = document.querySelector('.pl-section[data-category="actions"]');
  // 바는 컴포넌트 메뉴가 페이지 제목 아래로 옮긴다. 섹션 밖에 있을 수 있으므로 패널에서 찾는다.
  const bar = document.querySelector('#panel-components .view-controls[data-target-attr="data-view-target"]');
  if (!bar) return;
  const COLORS = ['elevated', 'filled', 'tonal', 'outlined', 'text'];
  const KEY = 'bw-actions-view';
  const view = { size: 's', shape: 'round', color: 'all', icon: 'on' };
  loadView(KEY, view);

  const apply = () => {
    section.dataset.viewColor = view.color;
    section.dataset.viewIcon = view.icon;
    section.querySelectorAll('[data-view-target]').forEach(target => {
      // 보기 전환 바 자신은 제외한다(바가 항목 안으로 옮겨져 있다).
      target.querySelectorAll('.btn-group:not(.view-controls *), .btn-group-connected:not(.view-controls *)').forEach(group => {
        group.dataset.size = view.size;
        if (group.classList.contains('btn-group-connected')) {
          if (view.shape === 'square') group.dataset.shape = 'square';
          else delete group.dataset.shape;
        }
      });
      target.querySelectorAll('.btn:not(.view-controls *)').forEach(button => {
        button.dataset.size = view.size;
        const inConnected = button.parentElement?.classList.contains('btn-group-connected') || button.parentElement?.classList.contains('btn-split');   // 분할 버튼은 square 형태가 없다
        if (view.shape === 'square' && !inConnected) button.dataset.shape = 'square';
        else delete button.dataset.shape;
        if (button.dataset.defaultColor) {
          const next = ['all', 'text'].includes(view.color) ? button.dataset.defaultColor : view.color;
          COLORS.forEach(color => button.classList.toggle(`btn-${color}`, color === next));
        }
      });
    });
    bar.querySelectorAll('[data-view-axis]').forEach(group => markRadios(group, view[group.dataset.viewAxis]));
    saveView(KEY, view);
  };

  onIslandPick(bar, '[data-view-axis]', (value, group) => { view[group.dataset.viewAxis] = value; apply(); });
  apply();
})();

// Extended FAB: 목록을 내리면 접히고(아이콘만) 올리면 펼쳐진다(Compose ExtendedFloatingActionButton expanded).
// 접혀도 접근 이름은 라벨 그대로다(라벨은 시각적으로만 접는다).
(() => {
  // 확장 FAB — 내리면 아이콘만 남게 접히고 올리면 펼쳐진다
  const bindFabScroll = (scroller, fab) => {
    let last = 0;
    scroller.addEventListener('scroll', () => {
      const y = scroller.scrollTop;
      if (Math.abs(y - last) < 4) return;
      fab.toggleAttribute('data-collapsed', y > last && y > 8);
      last = y;
    }, { passive: true });
  };
  const scroller = document.querySelector('[data-fab-scroller]');
  const fab = document.querySelector('[data-fab-live]');
  if (scroller && fab) bindFabScroll(scroller, fab);
  // Saving UI 장면 — 같은 동작, 모양은 모드별 추천(크기 · 색)
  document.addEventListener('saving:rendered', e => e.detail.block.querySelectorAll('[data-saving-fab]').forEach(phone => bindFabScroll(phone.querySelector('[data-fab-scroller]'), phone.querySelector('.m3-fab'))));
})();

// soft-disabled: 비활성이지만 포커스는 받는 버튼(material-web의 soft-disabled). 활성화만 막는다.
document.querySelectorAll('.btn[aria-disabled="true"]').forEach(button => {
  const block = event => { event.preventDefault(); event.stopImmediatePropagation(); };
  button.addEventListener('click', block, true);
  button.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') block(event); }, true);
});

// Standard button group: 누른 버튼 폭 +15%, 이웃 버튼이 같은 양을 나눠 줄인다(MDC childSizeChange · Compose ExpandedRatio).
(() => {
  const RATIO = 0.15;
  let active = null;
  const reset = group => group.querySelectorAll(':scope > .btn').forEach(b => b.style.removeProperty('--btn-width-delta'));
  const press = button => {
    const group = button.parentElement;
    if (!group?.classList.contains('btn-group') || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
    if (active) reset(active.parentElement);
    active = button;
    const delta = button.offsetWidth * RATIO;
    const neighbors = [button.previousElementSibling, button.nextElementSibling].filter(el => el?.classList.contains('btn'));
    button.style.setProperty('--btn-width-delta', `${delta}px`);
    neighbors.forEach(n => n.style.setProperty('--btn-width-delta', `${-delta / neighbors.length}px`));
  };
  // 포인터를 버튼 밖에서 떼도 원래 폭으로 돌아온다.
  const release = () => { if (active) reset(active.parentElement); active = null; };
  document.addEventListener('pointerdown', event => { const b = event.target.closest?.('.btn-group > .btn'); if (b) press(b); });
  ['pointerup', 'pointercancel'].forEach(type => document.addEventListener(type, release, true));
  document.addEventListener('keydown', event => { if ((event.key === ' ' || event.key === 'Enter') && event.target.matches?.('.btn-group > .btn')) press(event.target); });
  document.addEventListener('keyup', release);
  // 누르는 순간 이전 요소의 focusout이 오므로, 눌린 버튼 자신이 포커스를 잃을 때만 되돌린다.
  document.addEventListener('focusout', event => { if (event.target === active) release(); });
})();

// ─── App bars(명세 4.4.1) — 페이지 아일랜드 Type이 States · Configurations · Live 모두를 바꾸고, Live는 스크롤 상태 ───
(() => {
  const bar = document.querySelector('.appbar-controls');
  const item = document.getElementById('app-bars-variants');
  if (!bar || !item) return;
  const KEY = 'bw-appbar-view';
  const view = loadView(KEY, { type: 'small' });
  if (!['search', 'small', 'medium', 'large'].includes(view.type)) view.type = 'small';
  const demo = item.querySelector('.appbar-scroller .appbar');
  const scroller = demo?.closest('.appbar-scroller');

  // 스크롤 — flexible은 펼친 높이에서 64까지 접히고(펼친 제목 → 윗줄 제목), 내용이 밑으로 지나가면 On scroll(surface-container).
  // small · search는 높이가 그대로이고 내용이 밑으로 지나가는 순간 On scroll.
  const onScroll = () => {
    if (!demo) return;
    const flexible = ['medium', 'large'].includes(demo.dataset.variant);
    const top = scroller.scrollTop;
    const expandedTitle = demo.querySelector('.appbar-titles--expanded');
    if (!flexible) {
      demo.style.height = demo.style.minHeight = demo.style.marginBottom = '';
      demo.dataset.scrolled = String(top > 0);
      return;
    }
    const expanded = parseFloat(getComputedStyle(demo).getPropertyValue('--appbar-h')) || 112;
    const range = Math.max(1, expanded - 64);
    const offset = Math.min(top, range);
    const t = offset / range;
    demo.style.minHeight = demo.style.height = `${expanded - offset}px`;
    demo.style.marginBottom = `${offset}px`;   // 줄어든 만큼 아래 여백 — 스크롤 위치가 되튀지 않게
    if (expandedTitle) { expandedTitle.style.opacity = String(1 - t); expandedTitle.style.visibility = t >= 1 ? 'hidden' : ''; }
    demo.toggleAttribute('data-collapsed', t >= 1);
    demo.dataset.scrolled = String(top > range);
  };
  scroller?.addEventListener('scroll', onScroll, { passive: true });

  const apply = () => {
    item.querySelectorAll('[data-appbar-sample]').forEach(appbar => { appbar.dataset.variant = view.type; });
    item.querySelectorAll('[data-appbar-row]').forEach(row => { row.hidden = row.dataset.appbarRow !== view.type; });
    item.querySelectorAll('[data-appbar-only]').forEach(row => { row.hidden = !row.dataset.appbarOnly.split(' ').includes(view.type); });
    markRadios(bar.querySelector('[data-appbar-axis]'), view.type);
    if (scroller) {
      const expandedTitle = demo.querySelector('.appbar-titles--expanded');
      if (expandedTitle) expandedTitle.style.opacity = expandedTitle.style.visibility = '';
      demo.removeAttribute('data-collapsed');
      scroller.scrollTop = 0;
      onScroll();
    }
    saveView(KEY, view);
  };
  onIslandPick(bar, '[data-appbar-axis]', value => { view.type = value; apply(); });
  apply();
})();

// ─── Badges 라이브 데모 — 선택하면 그 목적지의 배지를 숨기고, 개수는 999를 넘으면 "999+" ───
(() => {
  const root = document.querySelector('[data-badge-live]');
  if (!root) return;
  const initial = () => ({ home: 0, mail: 3, chat: true });
  let counts = initial();
  const items = [...root.querySelectorAll('[data-badge-dest]')];
  const render = () => {
    items.forEach(item => {
      const key = item.dataset.badgeDest;
      const value = counts[key];
      const badge = item.querySelector('.badge');
      const text = formatBadgeCount(value);
      badge.hidden = text === null;
      badge.dataset.size = value === true ? 'small' : 'large';
      badge.style.letterSpacing = '';
      badge.textContent = value === true || text === null ? '' : text;
      item.setAttribute('aria-label', badgeAccessibleLabel(item.dataset.badgeLabel, value));
    });
  };
  items.forEach(item => item.addEventListener('click', () => {
    items.forEach(other => {
      const on = other === item;
      other.dataset.active = String(on);
      other.setAttribute('aria-current', on ? 'page' : 'false');
    });
    counts[item.dataset.badgeDest] = 0;
    render();
  }));
  root.addEventListener('click', event => {
    const action = event.target.closest('[data-badge-action]')?.dataset.badgeAction;
    if (!action) return;
    if (action === 'reset') counts = initial();
    else counts.mail = (Number(counts.mail) || 0) + (action === 'add100' ? 100 : 1);
    render();
  });
  render();
})();

// ─── Large 배지 폭 맞춤 — 34를 넘으면 자간을 줄인다. 보이게 되거나 글자가 바뀌면 다시 잰다 ───
(() => {
  const fit = badge => {
    if (badge.dataset.size !== 'large' || badge.hidden) return;
    const width = badge.getBoundingClientRect().width;
    const tracking = parseFloat(getComputedStyle(badge).letterSpacing) || 0;
    const next = badgeTracking(width, tracking, [...badge.textContent].length);
    if (next !== null && next !== tracking) badge.style.letterSpacing = `${next}px`;
  };
  const observer = 'ResizeObserver' in window ? new ResizeObserver(entries => entries.forEach(entry => fit(entry.target))) : null;
  const badges = document.querySelectorAll('.badge');
  badges.forEach(badge => { observer?.observe(badge); fit(badge); });
  document.fonts?.ready.then(() => badges.forEach(badge => { badge.style.letterSpacing = ''; fit(badge); }));
})();

// ─── Cards 보기 전환(Type)과 선택 카드 ───
(() => {
  const bar = document.querySelector('.card-controls');
  const cards = [...document.querySelectorAll('[data-card-target] .m3-card[data-card-switch]')];
  if (!bar || !cards.length) return;
  const KEY = 'bw-card-view';
  const view = { type: 'elevated' };
  loadView(KEY, view);
  const apply = () => {
    cards.forEach(card => { card.dataset.type = view.type; });
    // States 표도 고른 Type의 행만 보인다 — 페이지 옵션은 페이지의 모든 견본이 따른다(2026-09-28).
    document.querySelectorAll('[data-card-target] tr[data-card-type]').forEach(row => { row.hidden = row.dataset.cardType !== view.type; });
    bar.querySelectorAll('[data-card-axis]').forEach(group => markRadios(group, view[group.dataset.cardAxis]));
    saveView(KEY, view);
  };
  onIslandPick(bar, '[data-card-axis]', (value, group) => { view[group.dataset.cardAxis] = value; apply(); });
  document.querySelectorAll('[data-card-check]').forEach(card => card.addEventListener('click', () => {
    card.setAttribute('aria-pressed', String(card.getAttribute('aria-pressed') !== 'true'));
  }));
  apply();
})();

// ─── Loading indicator · Progress indicators — 보기 전환, SVG 그리기, 라이브(명세 4.3.1 · 4.3.2) ───
// 움직이는 견본은 requestAnimationFrame 하나로 그리고, 화면 밖이거나 탭이 숨으면 멈춘다.
(() => {
  const loadingRoot = document.getElementById('loading-indicator-variants');
  const progressRoot = document.getElementById('progress-indicators-variants');
  if (!loadingRoot && !progressRoot) return;
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduced = () => !!reduce?.matches;
  const f = v => Math.round(v * 100) / 100;
  let raf = 0;
  const t0 = performance.now();

  // 보기 전환 바(카드 · 리스트와 같은 방식)
  const bindBar = (bar, axisAttr, key, view, apply) => {
    if (!bar) return;
    loadView(key, view);
    const camel = axisAttr.replace(/^data-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const sync = () => {
      bar.querySelectorAll(`[${axisAttr}]`).forEach(group => {
        group.querySelectorAll('[role="radio"]').forEach(button => {
          const on = button.dataset.value === view[group.dataset[camel]];
          button.setAttribute('aria-checked', String(on));
          button.tabIndex = on ? 0 : -1;
        });
      });
      saveView(key, view);
      apply();
    };
    const onEvent = event => {
      const group = event.target.closest(`[${axisAttr}]`);
      const checked = group?.querySelector('[role="radio"][aria-checked="true"]');
      if (!checked) return;
      view[group.dataset[camel]] = checked.dataset.value;
      sync();
    };
    bar.addEventListener('click', onEvent);
    bar.addEventListener('keydown', onEvent);
    sync();
  };

  /* ─── Loading indicator ─── */
  const loadingView = { containment: 'default' };
  const loadings = () => [...document.querySelectorAll('.m3-loading')];
  const drawLoading = (el, ms) => {
    const path = el.querySelector('.m3-loading-shape');
    const rotor = el.querySelector('.m3-loading-rotor');
    if (!path) return;
    const scale = (LOADING.active / LOADING.container);
    if (el.dataset.value !== undefined) {
      const { progress, rotation } = loadingDeterminate(parseFloat(el.dataset.value) || 0);
      path.setAttribute('d', morphPath(LOADING_SHAPES.determinate, progress, 48, LOADING_SHAPES.determinateScale * scale));
      rotor.setAttribute('transform', `rotate(${f(rotation)} 24 24)`);
      return;
    }
    if (reduced()) {   // 움직임 줄이기: 모핑 없이 첫 모양만 천천히 회전
      path.setAttribute('d', morphPath(LOADING_SHAPES.indeterminate[0], 0, 48, LOADING_SHAPES.indeterminateScale * scale));
      rotor.setAttribute('transform', `rotate(${f(((ms % LOADING.rotationMs) / LOADING.rotationMs) * 360)} 24 24)`);
      return;
    }
    const { index, progress, rotation } = loadingFrame(ms, LOADING_SHAPES.indeterminate.length);
    path.setAttribute('d', morphPath(LOADING_SHAPES.indeterminate[index], progress, 48, LOADING_SHAPES.indeterminateScale * scale));
    rotor.setAttribute('transform', `rotate(${f(rotation)} 24 24)`);
  };
  bindBar(document.querySelector('.loading-controls'), 'data-loading-axis', 'bw-loading-view', loadingView, () => {
    document.querySelectorAll('.m3-loading[data-loading-switch]').forEach(el => { el.dataset.containment = loadingView.containment; });
  });

  /* ─── Progress indicators ─── */
  const progressView = { shape: 'flat', thickness: 'default' };
  const state = new WeakMap();   // 요소별 표시 값 · 진폭 애니메이션
  const ensureSvg = el => {
    let svg = el.querySelector('svg');
    if (!svg) {
      svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('aria-hidden', 'true');
      for (const cls of ['m3-progress-track', 'm3-progress-active']) {
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('class', cls);
        svg.append(p);
      }
      const stop = document.createElementNS(NS, 'circle');
      stop.setAttribute('class', 'm3-progress-stop');
      svg.append(stop);
      el.append(svg);
    }
    return svg;
  };
  const target = el => (el.dataset.value === undefined ? null : Math.min(1, Math.max(0, parseFloat(el.dataset.value) || 0)));
  // 값 · 진폭을 시간에 따라 옮긴다 — 값: 평평 스프링(강성 50, 넘침 없음) / 물결 tween long2 선형, 진폭: long2(커질 때 standard, 줄 때 emphasized-accelerate)
  const animated = (el, ms) => {
    const wavy = el.dataset.shape === 'wavy';
    const goal = target(el);
    let s = state.get(el);
    if (!s) { s = { value: goal ?? 0, from: goal ?? 0, to: goal ?? 0, at: ms, amp: 0, ampFrom: 0, ampTo: 0, ampAt: ms }; state.set(el, s); }
    if (goal !== null && goal !== s.to) { s.from = s.value; s.to = goal; s.at = ms; }
    if (goal !== null) {
      const t = ms - s.at;
      if (reduced()) s.value = s.to;
      else if (wavy) s.value = s.from + (s.to - s.from) * Math.min(1, t / 500);
      else { const w = Math.sqrt(50), x = t / 1000; s.value = s.to + (s.from - s.to) * (1 + w * x) * Math.exp(-w * x); }
    }
    const ampGoal = !wavy || reduced() ? 0 : goal === null ? 1 : waveAmplitudeFor(s.value);
    if (ampGoal !== s.ampTo) { s.ampFrom = s.amp; s.ampTo = ampGoal; s.ampAt = ms; }
    const k = Math.min(1, (ms - s.ampAt) / 500);
    s.amp = s.ampFrom + (s.ampTo - s.ampFrom) * (s.ampTo > s.ampFrom ? EASE.standard(k) : EASE.emphasizedAccelerate(k));
    const moving = goal === null || Math.abs(s.value - s.to) > 1e-4 || k < 1 || (wavy && s.amp > 0 && !reduced());
    return { value: goal === null ? null : s.value, amp: s.amp, moving };
  };

  const wavePoints = (x0, x1, y, amp, lambda, phase) => {
    let d = '';
    const step = 1;
    for (let x = x0; x <= x1 + 1e-6; x += step) {
      const xx = Math.min(x, x1);
      const yy = y + amp * Math.sin((2 * Math.PI * (xx - phase)) / lambda);
      d += `${d ? 'L' : 'M'}${f(xx)} ${f(yy)}`;
      if (xx === x1) break;
    }
    return d;
  };
  const drawLinear = (el, ms) => {
    const svg = ensureSvg(el);
    const [track, active, stop] = svg.children;
    const scale = 1;
    const t = (el.dataset.thickness === 'thick' ? PROGRESS.thickness.thick : PROGRESS.thickness.default) * scale;
    const wavy = el.dataset.shape === 'wavy';
    const width = Math.max(t * 2, el.getBoundingClientRect().width || parseFloat(getComputedStyle(el).width) || 240);
    const height = wavy ? PROGRESS.linear.waveHeight[el.dataset.thickness === 'thick' ? 'thick' : 'default'] : t;
    const y = height / 2;
    svg.setAttribute('width', f(width));
    svg.setAttribute('height', f(height));
    svg.setAttribute('viewBox', `0 0 ${f(width)} ${f(height)}`);
    el.style.height = `${height}px`;
    track.setAttribute('stroke-width', t);
    active.setAttribute('stroke-width', t);
    const { value, amp, moving } = animated(el, ms);
    const indeterminate = value === null;
    const lambda = indeterminate ? PROGRESS.linear.indeterminateWavelength : PROGRESS.linear.wavelength;
    const phase = reduced() ? 0 : ((ms / 1000) * lambda) % lambda;   // 1초에 한 파장(Compose waveSpeed = wavelength)
    const A = PROGRESS.linear.amplitude * amp;
    const seg = ([a, b]) => linearSegment([a, b], width, t);
    const line = ([a, b]) => `M${f(a)} ${f(y)}L${f(b)} ${f(y)}`;
    const wave = ([a, b]) => (A > 0.01 ? wavePoints(a, b, y, A, lambda, phase) : line([a, b]));
    let trackD = '', activeD = '';
    if (indeterminate) {
      const parts = linearIndeterminateParts(reduced() ? 600 : ms, width, t);
      trackD = parts.track.map(p => line(seg(p))).join('');
      activeD = parts.active.map(p => wave(seg(p))).join('');
      stop.setAttribute('r', 0);
    } else {
      const det = linearDeterminate(value, width, t);
      if (det.track) trackD = line(seg(det.track));
      if (det.active) activeD = wave(seg(det.active));
      const s = linearStop(width, t);
      stop.setAttribute('cx', f(s.cx));
      stop.setAttribute('cy', f(y));
      stop.setAttribute('r', f(s.r));
    }
    track.setAttribute('d', trackD);
    active.setAttribute('d', activeD);
    return indeterminate || moving;
  };

  const arc = (cx, cy, r, startDeg, sweepDeg) => {
    if (sweepDeg <= 0) return '';
    if (sweepDeg >= 359.9) return arc(cx, cy, r, startDeg, 180) + arc(cx, cy, r, startDeg + 180, 180).replace(/^M[^A]*/, '');   // 끝점이 겹치면 SVG가 호를 그리지 않으므로 반원 둘로
    const sweep = sweepDeg;
    const a0 = (startDeg * Math.PI) / 180, a1 = ((startDeg + sweep) * Math.PI) / 180;
    return `M${f(cx + r * Math.cos(a0))} ${f(cy + r * Math.sin(a0))}A${f(r)} ${f(r)} 0 ${sweep > 180 ? 1 : 0} 1 ${f(cx + r * Math.cos(a1))} ${f(cy + r * Math.sin(a1))}`;
  };
  const waveArc = (cx, cy, r, startDeg, sweepDeg, amp, count, phase) => {
    if (sweepDeg <= 0) return '';
    let d = '';
    const steps = Math.max(2, Math.ceil(sweepDeg / 2));
    for (let i = 0; i <= steps; i += 1) {
      const deg = startDeg + (sweepDeg * i) / steps;
      const th = (deg * Math.PI) / 180;
      const rr = r + amp * Math.sin(count * (th + Math.PI / 2) - phase);
      d += `${d ? 'L' : 'M'}${f(cx + rr * Math.cos(th))} ${f(cy + rr * Math.sin(th))}`;
    }
    return d;
  };
  const drawCircular = (el, ms) => {
    const svg = ensureSvg(el);
    const [track, active, stop] = svg.children;
    stop.setAttribute('r', 0);
    const thick = el.dataset.thickness === 'thick';
    const wavy = el.dataset.shape === 'wavy';
    // 기준 지름: 평평 40(Thick 52), 물결 48(Thick은 출처에 없어 평평 Thick + 8 = 60). data-size가 있으면 비율대로 키운다(물결도 비례 — M3 Responsive)
    const base = (thick ? PROGRESS.circular.size.thick : PROGRESS.circular.size.default) + (wavy ? PROGRESS.circular.waveSize - PROGRESS.circular.size.default : 0);
    const size = el.dataset.size ? parseFloat(el.dataset.size) : base;
    const k = size / base;
    const t = (thick ? PROGRESS.thickness.thick : PROGRESS.thickness.default) * k;
    const A = PROGRESS.circular.amplitude * k;
    svg.setAttribute('width', f(size));
    svg.setAttribute('height', f(size));
    svg.setAttribute('viewBox', `0 0 ${f(size)} ${f(size)}`);
    el.style.width = el.style.height = `${size}px`;
    track.setAttribute('stroke-width', f(t));
    active.setAttribute('stroke-width', f(t));
    const { value, amp, moving } = animated(el, ms);
    const c = size / 2;
    const r = (size - t) / 2 - (wavy ? A : 0);
    const count = circularWaveCount(r, PROGRESS.circular.wavelength * k);
    const phase = reduced() ? 0 : ((ms / 1000) * (PROGRESS.circular.wavelength * k)) / r * count;
    const activeArc = (start, sweep) => (wavy && amp > 0.01 ? waveArc(c, c, r, start, sweep, A * amp, count, phase) : arc(c, c, r, start, sweep));
    const gapSweep = ((PROGRESS.circular.gap * k + t) / (Math.PI * size)) * 360;
    if (value === null) {
      const { rotation, sweep } = circularIndeterminate(reduced() ? 1200 : ms);
      const g = Math.min(sweep, gapSweep);
      // Compose: 캔버스를 회전시킨 뒤 활성은 0°(3시)부터 sweep, 트랙은 활성 끝 + 간격부터
      track.setAttribute('d', arc(c, c, r, rotation + sweep + g, 360 - sweep - g * 2));
      active.setAttribute('d', activeArc(rotation, Math.max(sweep, 0.1)));
      return true;
    }
    const det = circularDeterminate(value, size, t, PROGRESS.circular.gap * k);
    track.setAttribute('d', arc(c, c, r, det.trackStart, det.trackSweep));
    active.setAttribute('d', det.sweep > 0 ? activeArc(det.start, det.sweep) : '');
    return moving;
  };
  const drawProgress = (el, ms) => (el.dataset.type === 'circular' ? drawCircular(el, ms) : drawLinear(el, ms));
  const progresses = () => [...document.querySelectorAll('.m3-progress')];
  bindBar(document.querySelector('.progress-controls'), 'data-progress-axis', 'bw-progress-view', progressView, () => {
    document.querySelectorAll('.m3-progress[data-progress-switch]').forEach(el => {
      el.dataset.shape = progressView.shape;
      el.dataset.thickness = progressView.thickness;
    });
    wake();
  });

  /* ─── 그리기 고리 — 보이는 견본만, 움직일 것이 있을 때만 ─── */
  const visible = new Set();
  const io = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(entries => { entries.forEach(e => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target))); wake(); })
    : null;
  function frame(now) {
    raf = 0;
    const ms = now - t0;
    let again = false;
    const list = io ? [...visible] : [...loadings(), ...progresses()];
    list.forEach(el => {
      if (!el.isConnected || el.hidden || el.closest('[hidden]')) return;
      if (el.classList.contains('m3-loading')) { drawLoading(el, ms); again ||= el.dataset.value === undefined; }
      else again = drawProgress(el, ms) || again;
    });
    if (again && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function wake() { if (!raf) raf = requestAnimationFrame(frame); }
  const observeAll = () => [...loadings(), ...progresses()].forEach(el => { io?.observe(el); });
  observeAll();
  document.addEventListener('saving:rendered', () => { observeAll(); wake(); });
  document.addEventListener('saving:wake', wake);   // Saving UI 장면이 값을 바꾸면 다시 그린다   // Saving UI 장면의 로딩 표시도 그린다
  document.addEventListener('visibilitychange', wake);
  reduce?.addEventListener?.('change', wake);
  window.addEventListener('resize', wake);
  // 메뉴 전환으로 숨었던 견본이 보이면 다시 그린다
  if (typeof ResizeObserver === 'function') [loadingRoot, progressRoot].filter(Boolean).forEach(root => new ResizeObserver(wake).observe(root));
  wake();

  /* ─── 라이브: 새로 고침(로딩 표시) ─── */
  const live = document.querySelector('[data-loading-live]');
  if (live) {
    const button = live.querySelector('[data-loading-refresh]');
    const body = live.querySelector('.m3-loading-live-body');
    const overlay = live.querySelector('[data-loading-overlay]');
    let busy = false;
    button.addEventListener('click', () => {
      if (busy) return;
      busy = true;
      body.setAttribute('aria-busy', 'true');
      overlay.hidden = false;
      wake();
      // 짧은 대기(200ms ~ 5s)에 쓰는 표시 — 1.6초 뒤 새 시각으로 바뀐다
      setTimeout(() => {
        const now = new Date();
        const stamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        live.querySelectorAll('[data-loading-stamp]').forEach(el => { el.textContent = stamp; });
        overlay.hidden = true;
        body.removeAttribute('aria-busy');
        busy = false;
      }, 1600);
    });
  }
  const det = document.querySelector('[data-loading-det]');
  if (det) {
    const indicator = det.querySelector('[data-loading-det-indicator]');
    const button = det.querySelector('[data-loading-download]');
    let timer = 0;
    button.addEventListener('click', () => {
      cancelAnimationFrame(timer);
      const start = performance.now();
      const step = now => {
        const p = Math.min(1, (now - start) / 2500);
        indicator.dataset.value = String(p);
        indicator.setAttribute('aria-valuenow', String(Math.round(p * 100)));
        drawLoading(indicator, 0);
        if (p < 1) timer = requestAnimationFrame(step);
      };
      timer = requestAnimationFrame(step);
    });
  }

  /* ─── 라이브: 불확정 → 확정(진행 표시) ─── */
  const pLive = document.querySelector('[data-progress-live]');
  if (pLive) {
    const bars = [...pLive.querySelectorAll('[data-progress-live-target]')];
    const label = pLive.querySelector('[data-progress-live-value]');
    let timers = [];
    const setValue = v => {
      bars.forEach(el => {
        if (v === null) { delete el.dataset.value; el.removeAttribute('aria-valuenow'); el.removeAttribute('aria-valuemin'); el.removeAttribute('aria-valuemax'); }
        else { el.dataset.value = String(v); el.setAttribute('aria-valuemin', '0'); el.setAttribute('aria-valuemax', '100'); el.setAttribute('aria-valuenow', String(Math.round(v * 100))); }
      });
      label.textContent = v === null ? '준비 중' : `${Math.round(v * 100)}%`;
      wake();
    };
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    const reset = () => { clear(); setValue(0); label.textContent = '대기'; };
    pLive.querySelector('[data-progress-start]').addEventListener('click', () => {
      clear();
      setValue(null);   // 남은 양을 모를 때는 불확정, 알게 되면 확정으로(M3 Guidelines)
      const steps = [0.12, 0.27, 0.41, 0.58, 0.66, 0.83, 0.94, 1];
      steps.forEach((v, i) => timers.push(setTimeout(() => setValue(v), 1400 + i * 650)));
    });
    pLive.querySelector('[data-progress-reset]').addEventListener('click', reset);
    reset();
  }
})();

// ─── Menus 보기 전환(Color · Density) · 라이브 메뉴(열기 · 키보드 · 하위 메뉴 · 선택 · 맥락 메뉴, 명세 4.6.3) ───
(() => {
  const root = document.getElementById('menus-variants');
  const bar = document.querySelector('.menu-controls');
  if (!root || !bar) return;
  const KEY = 'bw-menu-view';
  const view = { color: 'standard', density: '0' };
  loadView(KEY, view);
  const apply = () => {
    root.querySelectorAll('.m3-menu[data-menu-switch]').forEach(menu => {
      menu.dataset.color = view.color;
      menu.dataset.density = view.density;
    });
    bar.querySelectorAll('[data-menu-axis]').forEach(group => markRadios(group, view[group.dataset.menuAxis]));
    saveView(KEY, view);
  };
  onIslandPick(bar, '[data-menu-axis]', (value, group) => { view[group.dataset.menuAxis] = value; apply(); });
  apply();

  /* ─── 떠 있는 메뉴 ─── */
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const openStack = [];   // 열린 메뉴(바깥 → 하위) { menu, opener }
  const items = menu => [...menu.querySelectorAll('.m3-menu-item')];
  const rtlOf = el => getComputedStyle(el).direction === 'rtl';
  const place = (menu, anchorRect, kind) => {
    menu.hidden = false;
    menu.style.left = '0px';
    menu.style.top = '0px';
    // 열림 애니메이션(크기 0.8)이 걸려 있어도 원래 크기로 잰다
    const pos = menuPlacement(anchorRect, { width: menu.offsetWidth, height: menu.offsetHeight }, { width: window.innerWidth, height: window.innerHeight }, { kind, rtl: rtlOf(menu), gap: Number(menu.dataset.menuGap || 0), align: menu.dataset.menuAlign || 'start', prefer: menu.dataset.menuPrefer || 'below' });
    menu.style.left = `${Math.round(pos.left)}px`;
    menu.style.top = `${Math.round(pos.top)}px`;
    menu.style.setProperty('--menu-origin', `${pos.originY} ${pos.originX}`);
  };
  const focusItem = (menu, index) => {
    const list = items(menu);
    if (!list.length) return;
    const i = Math.max(0, Math.min(index, list.length - 1));
    list.forEach((el, k) => { el.tabIndex = k === i ? 0 : -1; });
    list[i].focus();
  };
  const closeFrom = (depth, { restore = true } = {}) => {
    while (openStack.length > depth) {
      const { menu, opener } = openStack.pop();
      const finish = () => { menu.hidden = true; menu.removeAttribute('data-closing'); };
      if (reduce?.matches) finish();
      else { menu.setAttribute('data-closing', ''); setTimeout(finish, 150); }
      opener.setAttribute('aria-expanded', 'false');
      if (opener.matches('.btn:not([data-split])')) opener.removeAttribute('data-state');
      if (opener.matches('.m3-menu-item')) opener.closest('.m3-menu')?.removeAttribute('data-inactive');
      if (restore && openStack.length === depth) opener.focus();
    }
  };
  const open = (menu, opener, { rect, kind = 'below', focus = 'first' } = {}) => {
    const depth = openStack.findIndex(entry => entry.menu === opener.closest('.m3-menu')) + 1;
    closeFrom(depth, { restore: false });
    menu.removeAttribute('data-closing');
    place(menu, rect || opener.getBoundingClientRect(), kind);
    openStack.push({ menu, opener });
    opener.setAttribute('aria-expanded', 'true');
    if (opener.matches('.btn:not([data-split])')) opener.setAttribute('data-state', 'pressed');   // 메뉴가 열려 있는 동안 버튼은 눌린 상태(M3 Selecting). 분할 버튼은 펼침 모양(4.1.10)이 따로 있다
    if (opener.matches('.m3-menu-item')) opener.closest('.m3-menu')?.setAttribute('data-inactive', '');
    // 처음 포커스는 첫 항목(M3 Initial focus). 위 화살표로 열면 마지막 항목.
    if (focus) focusItem(menu, focus === 'last' ? items(menu).length - 1 : 0);
  };
  const depthOf = menu => openStack.findIndex(entry => entry.menu === menu);

  const activate = item => {
    const menu = item.closest('.m3-menu');
    if (item.getAttribute('aria-disabled') === 'true') return;   // 비활성은 고를 수 없다
    const sub = item.getAttribute('aria-controls') && document.getElementById(item.getAttribute('aria-controls'));
    if (sub) { open(sub, item, { kind: 'side' }); return; }
    const role = item.getAttribute('role');
    if (role === 'menuitemradio' || role === 'menuitemcheckbox') {
      const mode = role === 'menuitemradio' ? 'single' : 'multi';
      const list = items(menu).filter(el => el.getAttribute('role') === role);
      const next = menuSelect(list.map(el => el.getAttribute('aria-checked') === 'true'), list.indexOf(item), mode);
      list.forEach((el, i) => el.setAttribute('aria-checked', String(next[i])));
      const opener = openStack[depthOf(menu)]?.opener;
      const value = opener?.querySelector('[data-menu-value]');
      if (value && mode === 'single') value.textContent = item.querySelector('.m3-menu-label').textContent;
      if (!menuClosesOnSelect(mode)) return;
    } else {
      // 결과 표시 자리(data-result-target) — 가장 바깥 메뉴의 것을 쓴다
      const top = openStack[0]?.menu || menu;
      const out = document.getElementById(top.dataset.resultTarget || '');
      if (out) out.textContent = `선택: ${item.querySelector('.m3-menu-label').textContent}`;
    }
    closeFrom(0);
  };

  // 떠 있는 메뉴는 페이지 전체에서 같은 방식으로 다룬다(Split button 메뉴 포함, 2026-10-01)
  const bindPopup = menu => {
    menu.addEventListener('click', event => {
      const item = event.target.closest('.m3-menu-item');
      if (item) activate(item);
    });
    // 마우스를 올리면 그 항목에 포커스 · 하위 메뉴를 연다(데스크톱)
    menu.addEventListener('pointerover', event => {
      if (event.pointerType === 'touch') return;
      const item = event.target.closest('.m3-menu-item');
      if (!item || document.activeElement === item) return;
      const d = depthOf(menu);
      if (d < 0) return;
      const sub = item.getAttribute('aria-controls') && document.getElementById(item.getAttribute('aria-controls'));
      if (sub && item.getAttribute('aria-expanded') !== 'true') open(sub, item, { kind: 'side', focus: null });
      else if (!sub) closeFrom(d + 1, { restore: false });
      items(menu).forEach(el => { el.tabIndex = el === item ? 0 : -1; });
      item.focus({ preventScroll: true });
      if (openStack.length > d + 1) openStack[d].menu.setAttribute('data-inactive', ''); else menu.removeAttribute('data-inactive');
    });
    menu.addEventListener('focusin', () => {
      const d = depthOf(menu);
      openStack.forEach((entry, k) => entry.menu.toggleAttribute('data-inactive', k !== d));   // 포커스가 있는 메뉴만 둥글게
    });
    menu.addEventListener('keydown', event => {
      const list = items(menu);
      const index = list.indexOf(document.activeElement);
      const item = list[index];
      const d = depthOf(menu);
      const rtl = rtlOf(menu);
      const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
      const back = rtl ? 'ArrowRight' : 'ArrowLeft';
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        focusItem(menu, menuNextIndex(index, list.length, event.key));
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (item) activate(item);
      } else if (event.key === forward && item?.getAttribute('aria-controls')) {
        event.preventDefault();
        activate(item);
      } else if (event.key === back && d > 0) {
        event.preventDefault();
        closeFrom(d);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closeFrom(d);
      } else if (event.key === 'Tab') {
        closeFrom(0, { restore: false });   // 메뉴를 떠나면 닫는다
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const labels = list.map(el => el.querySelector('.m3-menu-label')?.textContent || '');
        const next = menuTypeahead(labels, index, event.key);
        if (next >= 0) { event.preventDefault(); focusItem(menu, next); }
      }
    });
  };
  document.querySelectorAll('[data-menu-popup]').forEach(bindPopup);

  // 버튼으로 여는 메뉴 — 클릭 · Enter · Space, 아래 · 위 화살표로도 연다(M3 Keyboard navigation)
  const bindMenuTrigger = trigger => {
    const menu = document.getElementById(trigger.getAttribute('aria-controls'));
    trigger.addEventListener('click', () => {
      if (trigger.getAttribute('aria-expanded') === 'true') closeFrom(0);
      else open(menu, trigger);
    });
    trigger.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        open(menu, trigger, { focus: event.key === 'ArrowUp' ? 'last' : 'first' });
      }
    });
  };
  document.querySelectorAll('[data-menu-trigger]').forEach(bindMenuTrigger);
  // Saving UI 장면에 복제한 떠 있는 메뉴(FAB Web menu 등) — Saving 블록이 직접 다루는 메뉴(data-saving-menu)는 빼고
  document.addEventListener('saving:rendered', e => {
    e.detail.block.querySelectorAll('[data-menu-popup]').forEach(bindPopup);
    e.detail.block.querySelectorAll('[data-menu-trigger]').forEach(t => { if (document.getElementById(t.getAttribute('aria-controls'))?.hasAttribute('data-menu-popup')) bindMenuTrigger(t); });
  });
  // 맥락 메뉴 — 오른쪽 클릭 위치, 키보드는 Shift+F10 · 메뉴 키(요소 아래)
  document.querySelectorAll('[data-menu-context]').forEach(area => {
    const menu = document.getElementById(area.getAttribute('aria-controls'));
    area.addEventListener('contextmenu', event => {
      event.preventDefault();
      const x = event.clientX || area.getBoundingClientRect().left;
      const y = event.clientY || area.getBoundingClientRect().bottom;
      open(menu, area, { rect: { left: x, right: x, top: y, bottom: y } });
    });
    area.addEventListener('keydown', event => {
      if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') {
        event.preventDefault();
        open(menu, area);
      }
    });
  });
  // 바깥을 누르면 닫는다 · 스크롤 · 창 크기가 바뀌면 닫는다
  document.addEventListener('pointerdown', event => {
    if (!openStack.length) return;
    if (openStack.some(({ menu, opener }) => menu.contains(event.target) || opener.contains(event.target))) return;
    closeFrom(0, { restore: false });
  });
  const dismiss = () => { if (openStack.length) closeFrom(0, { restore: false }); };
  window.addEventListener('resize', dismiss);
  document.getElementById('library-preview')?.addEventListener('scroll', dismiss, { passive: true });
})();

// ─── Navigation bar · Navigation rail(가운데 정렬 여백 · 목적지 고르기 · 레일 펼침 · 모달, 명세 4.4.2) ───
(() => {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const NAV_ITEM = '.m3-nav-item';

  // 가로 항목 바는 가운데 정렬 — 양쪽 여백은 Compose 공식(navCenteredPadding)
  const fitBar = bar => {
    const count = bar.querySelectorAll(`:scope > ${NAV_ITEM}`).length;
    const pad = bar.dataset.layout === 'horizontal' ? navCenteredPadding(count, bar.clientWidth) : 0;
    bar.style.setProperty('--nav-bar-pad', `${pad}px`);
  };
  const bars = [...document.querySelectorAll('.m3-nav-bar')].filter(bar => !bar.closest('.m3-nav-cell'));
  bars.forEach(fitBar);
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(entries => entries.forEach(entry => fitBar(entry.target)));
    bars.forEach(bar => ro.observe(bar));
  }

  // 목적지 고르기 — 다른 항목은 화면 바꿈, 같은 항목을 다시 고르면 맨 위로(M3 Guidelines)
  const choose = (nav, item, onNavigate) => {
    const items = [...nav.querySelectorAll(NAV_ITEM)];
    const current = items.findIndex(el => el.getAttribute('aria-current') === 'page');
    const result = navSelect(current, items.indexOf(item), items.length);
    if (result.action === 'none') return;
    const frame = nav.closest('.m3-nav-frame');
    const content = frame?.querySelector('[data-nav-content]');
    if (result.action === 'reselect') {
      content?.scrollTo({ top: 0, behavior: reduce?.matches ? 'instant' : 'smooth' });
      return;
    }
    items.forEach((el, i) => el.setAttribute('aria-current', i === result.active ? 'page' : 'false'));
    const label = item.querySelector('.m3-nav-label')?.firstChild?.textContent.trim() || '';
    const title = frame?.querySelector('[data-nav-title]');
    if (title) title.textContent = label;
    frame?.querySelectorAll('[data-nav-lines] > *').forEach((line, i) => { line.textContent = `${label} 항목 ${i + 1}`; });
    if (content) content.scrollTop = 0;
    onNavigate?.(item);
  };
  const wireItems = (nav, { arrows = false, onNavigate } = {}) => {
    nav.addEventListener('click', event => {
      const item = event.target.closest(NAV_ITEM);
      if (!item) return;
      event.preventDefault();   // 데모 — 주소는 바꾸지 않는다
      choose(nav, item, onNavigate);
    });
    nav.addEventListener('keydown', event => {
      const item = event.target.closest(NAV_ITEM);
      if (!item) return;
      if (event.key === ' ') { event.preventDefault(); choose(nav, item, onNavigate); return; }   // Space · Enter로 고른다(M3 Accessibility)
      if (!arrows) return;
      const items = [...nav.querySelectorAll(NAV_ITEM)];
      const next = navNextIndex(items.indexOf(item), items.length, event.key);
      if (next !== items.indexOf(item) && next >= 0) { event.preventDefault(); items[next].focus(); }
    });
  };

  /* ─── 바 데모 — Live 아일랜드 Layout(Vertical · Horizontal) ─── */
  const barFrame = document.querySelector('[data-nav-bar-live]');
  const barControls = document.querySelector('.navbar-controls');
  if (barFrame && barControls) {
    const nav = barFrame.querySelector('.m3-nav-bar');
    wireItems(nav);
    const KEY = 'bw-navbar-view';
    const view = { layout: 'vertical' };
    loadView(KEY, view);
    const apply = () => {
      nav.dataset.layout = view.layout;
      barFrame.dataset.layout = view.layout;
      fitBar(nav);
      barControls.querySelectorAll('[data-navbar-axis]').forEach(group => markRadios(group, view[group.dataset.navbarAxis]));
      saveView(KEY, view);
    };
    onIslandPick(barControls, '[data-navbar-axis]', (value, group) => { view[group.dataset.navbarAxis] = value; apply(); });
    apply();
  }

  /* ─── 레일 — 펼친 폭(가장 넓은 항목 + 20, 220 ~ 360) ─── */
  const measureRail = rail => {
    const was = rail.dataset.expanded;
    const transition = rail.style.transition;
    rail.style.transition = 'none';
    rail.dataset.expanded = 'true';
    rail.style.removeProperty('--nav-rail-expanded-w');
    rail.style.removeProperty('--nav-rail-min');
    const widths = [...rail.querySelectorAll(`${NAV_ITEM} .m3-nav-indicator`)].map(el => el.getBoundingClientRect().width + NAV_RAIL.itemHorizontalPadding);
    const fab = rail.querySelector('.m3-nav-rail-header > .m3-fab');
    if (fab) widths.push(fab.getBoundingClientRect().width + NAV_RAIL.itemHorizontalPadding);
    rail.style.setProperty('--nav-rail-expanded-w', `${navRailExpandedWidth(Math.max(0, ...widths))}px`);
    rail.style.setProperty('--nav-rail-min', '0px');
    rail.dataset.expanded = was;
    void rail.offsetWidth;   // 접힌 폭을 확정한 뒤 전환을 되살린다
    rail.style.transition = transition;
  };

  /* ─── 레일 데모 — 메뉴 버튼으로 펼침 · 접기, Live 아일랜드 Type(Standard · Modal) ─── */
  const railFrame = document.querySelector('[data-nav-rail-live]');
  const railControls = document.querySelector('.navrail-controls');
  if (railFrame && railControls) {
    const rail = railFrame.querySelector('.m3-nav-rail');
    const toggle = rail.querySelector('[data-nav-rail-toggle]');
    const fab = rail.querySelector('[data-nav-rail-fab]');
    const scrim = railFrame.querySelector('[data-nav-scrim]');
    const modal = () => rail.hasAttribute('data-modal');
    const focusables = () => [...rail.querySelectorAll(DIALOG_FOCUSABLE)].filter(el => el.offsetParent !== null);
    const setExpanded = (open, { restore = true } = {}) => {
      rail.dataset.expanded = String(open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? '내비게이션 접기' : '내비게이션 펼치기');
      fab?.toggleAttribute('data-collapsed', !open);   // 펼치면 확장 FAB(M3 Navigation rail)
      const overlay = open && modal();
      if (scrim) scrim.hidden = !overlay;
      // 모달로 펼치면 레일 밖 내용은 조작할 수 없다(scrim) — 내용 영역을 잠근다
      railFrame.querySelector('[data-nav-content]')?.toggleAttribute('inert', overlay);
      if (overlay) rail.setAttribute('aria-modal', 'true'); else rail.removeAttribute('aria-modal');
      if (!open && restore && rail.contains(document.activeElement) === false) toggle.focus();
    };
    measureRail(rail);
    window.addEventListener('resize', () => measureRail(rail));
    toggle.addEventListener('click', () => setExpanded(rail.dataset.expanded !== 'true'));
    wireItems(rail, {
      arrows: true,
      onNavigate: () => { if (modal() && rail.dataset.expanded === 'true') { setExpanded(false); toggle.focus(); } },   // 모달은 고르면 닫힌다
    });
    scrim?.addEventListener('click', () => { setExpanded(false); toggle.focus(); });
    rail.addEventListener('keydown', event => {
      if (!(modal() && rail.dataset.expanded === 'true')) return;
      if (event.key === 'Escape') { event.preventDefault(); setExpanded(false); toggle.focus(); return; }
      if (event.key !== 'Tab') return;
      const list = focusables();
      const target = dialogTabTarget(list.indexOf(document.activeElement), list.length, event.shiftKey);   // 모달은 포커스를 가둔다
      if (target >= 0) { event.preventDefault(); list[target].focus(); }
    });

    const KEY = 'bw-navrail-view';
    const view = { type: 'standard' };
    loadView(KEY, view);
    const apply = () => {
      rail.toggleAttribute('data-modal', view.type === 'modal');
      setExpanded(false, { restore: false });
      railControls.querySelectorAll('[data-navrail-axis]').forEach(group => markRadios(group, view[group.dataset.navrailAxis]));
      saveView(KEY, view);
    };
    onIslandPick(railControls, '[data-navrail-axis]', (value, group) => { view[group.dataset.navrailAxis] = value; apply(); });
    apply();
  }
})();

// ─── Lists 보기 전환(Style) · 자리 모양 · 줄 수 · 선택 · 키보드 · 펼침(명세 4.5.5) ───
(() => {
  const root = document.getElementById('lists-variants');
  const bar = document.querySelector('.list-controls');
  if (!root || !bar) return;
  const KEY = 'bw-list-view';
  const view = { style: 'standard' };
  loadView(KEY, view);
  const rtlOf = el => getComputedStyle(el).direction === 'rtl';

  // 자리(처음 · 가운데 · 끝 · 혼자)는 보이는 항목으로 다시 매긴다 — 펼치면 바뀐다(MDC updateAppearance).
  // 줄 수는 Compose ListItemType처럼 내용으로 정한다(보조 글자가 두 줄로 넘치면 3줄 항목).
  const layout = () => {
    root.querySelectorAll('.m3-li-list:not([data-pos-fixed])').forEach(list => {
      const items = [...list.children].filter(el => el.classList.contains('m3-li') && !el.hidden);
      listPositions(items.length).forEach((pos, i) => { items[i].dataset.pos = pos; });
    });
    const items = [...root.querySelectorAll('.m3-li')];
    items.forEach(li => li.removeAttribute('data-lines'));
    const lines = items.map(li => {
      const support = li.querySelector('.m3-li-supporting');
      const lineHeight = support ? parseFloat(getComputedStyle(support).lineHeight) || 20 : 0;
      return listItemLines({
        overline: !!li.querySelector('.m3-li-overline'),
        supporting: !!support,
        supportingMultiline: !!support && support.getBoundingClientRect().height > lineHeight * 1.5,
      });
    });
    items.forEach((li, i) => { li.dataset.lines = String(lines[i]); });
  };

  const apply = () => {
    root.querySelectorAll('.m3-li-list[data-list-switch]').forEach(list => { list.dataset.style = view.style; });
    bar.querySelectorAll('[data-list-axis]').forEach(group => markRadios(group, view[group.dataset.listAxis]));
    saveView(KEY, view);
  };
  onIslandPick(bar, '[data-list-axis]', (value, group) => { view[group.dataset.listAxis] = value; apply(); });

  // 키보드 — Tab은 목록의 한 자리(선택 항목, 없으면 처음)로 들어오고, 화살표로 감싸며 이동, Space · Enter 실행(M3 Lists Accessibility).
  const rove = (list, getTargets, entryIndex) => {
    const reset = () => {
      const targets = getTargets();
      const entry = entryIndex(targets);
      targets.forEach((el, i) => { el.tabIndex = i === entry ? 0 : -1; });
    };
    list.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const targets = getTargets();
      const index = targets.indexOf(document.activeElement);
      if (index < 0) return;
      const focusable = targets.map(el => el.getAttribute('aria-disabled') !== 'true');
      const next = listNextIndex(index, focusable, event.key, rtlOf(list));
      if (next === index || next < 0) return;
      event.preventDefault();
      targets.forEach((el, i) => { el.tabIndex = i === next ? 0 : -1; });
      targets[next].focus();
    });
    list.addEventListener('focusin', event => {
      const targets = getTargets();
      if (!targets.includes(event.target)) return;
      targets.forEach(el => { el.tabIndex = el === event.target ? 0 : -1; });
    });
    list.addEventListener('focusout', event => { if (!list.contains(event.relatedTarget)) reset(); });
    reset();
    return reset;
  };

  // 선택 목록(listbox) — single은 라디오, multi는 체크박스 · 스위치. 선택은 항목 전체에 적용된다(M3 Behavior).
  root.querySelectorAll('[role="listbox"]').forEach(box => {
    const mode = box.getAttribute('aria-multiselectable') === 'true' ? 'multi' : 'single';
    const options = () => [...box.querySelectorAll(':scope > [role="option"]')];
    const enabled = el => el.getAttribute('aria-disabled') !== 'true';
    const render = () => options().forEach(option => {
      const on = option.getAttribute('aria-selected') === 'true';
      option.querySelectorAll('.m3-li-control').forEach(control => { control.dataset.checked = String(on); });
    });
    const choose = option => {
      if (!enabled(option)) return;
      const all = options();
      const next = listSelect(all.map(o => o.getAttribute('aria-selected') === 'true'), all.indexOf(option), mode);
      all.forEach((o, i) => o.setAttribute('aria-selected', String(next[i])));
      render();
    };
    rove(box, options, targets => listEntryIndex(targets.map(o => o.getAttribute('aria-selected') === 'true'), targets.map(enabled)));
    box.addEventListener('click', event => {
      const option = event.target.closest('[role="option"]');
      if (!option || !enabled(option)) return;
      choose(option);
      option.focus();
    });
    box.addEventListener('keydown', event => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      const option = event.target.closest('[role="option"]');
      if (!option) return;
      event.preventDefault();
      choose(option);
    });
    render();
  });

  // 동작 목록 — 한 동작(single-action)은 항목마다 주 동작 하나, 여러 동작(multi-action)은 주 동작 뒤에 보조 동작.
  // 화살표는 보이는 모든 동작을 순서대로 돈다(M3 multi-action keyboard).
  root.querySelectorAll('[data-list-live="action"], [data-list-live="multiaction"]').forEach(list => {
    const targets = () => [...list.querySelectorAll(':scope > .m3-li:not([hidden]) :is(.m3-li-primary, .m3-li-action)')];
    const reset = rove(list, targets, () => 0);
    // 펼침 — 펼친 항목 모서리 lg, 하위 항목이 바로 밑에 나타난다(container transform 대신 페이드 · 이동)
    list.querySelectorAll('.m3-li-primary[aria-expanded]').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(open));
        toggle.getAttribute('aria-controls').split(/\s+/).forEach(id => { const child = document.getElementById(id); if (child) child.hidden = !open; });
        layout();
        const keep = document.activeElement;
        reset();
        if (list.contains(keep)) { targets().forEach(el => { el.tabIndex = el === keep ? 0 : -1; }); }
      });
    });
  });
  // 링크 견본은 이 페이지에 머문다
  root.querySelectorAll('a.m3-li-primary').forEach(link => link.addEventListener('click', event => event.preventDefault()));

  apply();
  layout();
  // 보일 때(메뉴 전환) · 폭이 바뀔 때 줄 수를 다시 잰다
  if (typeof ResizeObserver === 'function') {
    let last = 0;
    new ResizeObserver(entries => {
      const width = Math.round(entries[0].contentRect.width);
      if (width === last) return;
      last = width;
      layout();
    }).observe(root);
  }
})();

// ─── Carousel 보기 전환(Layout · Width)과 키라인 배치·키보드 조작 ───
(() => {
  const bindCarousel = (root, bar) => {
  const KEY = 'bw-carousel-view';
  const view = { layout: 'multi-browse', width: 'compact' };
  if (bar) loadView(KEY, view);
  const PREFERRED = { 'multi-browse': 186, hero: 316, 'center-hero': 280 };
  const KEYLINE = ['multi-browse', 'hero', 'center-hero'];
  const frame = root.querySelector('.m3-carousel-frame');
  const scroller = root.querySelector('[data-carousel-mode="keyline"]');
  const plain = root.querySelector('[data-carousel-mode="plain"]');
  const full = root.querySelector('[data-carousel-mode="full"]');
  const track = scroller.querySelector('.m3-carousel-track');
  const layer = scroller.querySelector('.m3-carousel-layer');
  const keyItems = [...layer.querySelectorAll('.m3-carousel-item')];
  const showAll = root.querySelector('[data-carousel-showall]');
  const allList = root.querySelector('.m3-carousel-all');
  const status = root.querySelector('[data-carousel-status]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let arrangement = null;
  let pitch = 1;
  let pMax = 0;

  const render = () => {
    if (!arrangement) return;
    const width = scroller.clientWidth;
    const p = scroller.scrollLeft / pitch;
    layer.scrollLeft = 0;   // overflow: clip 미지원 브라우저 보정
    keyItems.forEach((item, i) => {
      const box = reduce.matches
        ? { x: CAROUSEL.padding + (i - p) * pitch, w: arrangement.large }
        : carouselItemBox(i, p, arrangement, width, keyItems.length);
      item.style.transform = `translateX(${box.x}px)`;
      item.style.width = `${box.w}px`;
      const media = item.querySelector('.m3-carousel-media');
      media.style.width = `${arrangement.large}px`;
      media.style.left = `${(box.w - arrangement.large) / 2}px`;   // 가운데 기준 마스크(시차 효과)
      // 제목은 large 크기에서만 보인다(M3: medium은 제목을 숨김). 중간 투명도로 대비가 떨어지는 구간을 두지 않는다.
      item.style.setProperty('--label-opacity', box.w >= arrangement.large * 0.95 ? '1' : '0');
    });
  };
  const relayout = () => {
    if (!KEYLINE.includes(view.layout)) return;
    const width = scroller.clientWidth;
    if (!width) return;
    const p = arrangement ? scroller.scrollLeft / pitch : 0;
    arrangement = carouselArrangement(view.layout, width, PREFERRED[view.layout]);
    pitch = arrangement.large + CAROUSEL.gap;
    pMax = carouselMaxPosition(arrangement, keyItems.length);
    layer.style.width = `${width}px`;
    track.style.width = `${width + pMax * pitch}px`;
    track.querySelectorAll('.m3-carousel-snap').forEach(el => el.remove());
    for (let k = 0; k <= pMax; k += 1) {
      const mark = document.createElement('span');
      mark.className = 'm3-carousel-snap';
      mark.style.left = `${k * pitch}px`;
      track.append(mark);
    }
    scroller.scrollLeft = Math.min(p, pMax) * pitch;
    render();
  };
  scroller.addEventListener('scroll', render, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(scroller);
  reduce.addEventListener?.('change', render);

  const apply = () => {
    frame.dataset.layout = view.layout;
    frame.dataset.width = view.width;
    const mode = KEYLINE.includes(view.layout) ? 'keyline' : view.layout === 'full-screen' ? 'full' : 'plain';
    scroller.hidden = mode !== 'keyline';
    plain.hidden = mode !== 'plain';
    full.hidden = mode !== 'full';
    frame.setAttribute('aria-roledescription', '캐러셀');
    bar?.querySelectorAll('[data-carousel-axis]').forEach(group => markRadios(group, view[group.dataset.carouselAxis]));
    arrangement = null;
    scroller.scrollLeft = 0;
    plain.scrollLeft = 0;
    full.scrollTop = 0;
    relayout();
    if (bar) saveView(KEY, view);
  };
  if (bar) onIslandPick(bar, '[data-carousel-axis]', (value, group) => { if (view[group.dataset.carouselAxis] === value) return; view[group.dataset.carouselAxis] = value; apply(); });

  // 키보드 — Tab·←→(세로 배치는 ↑↓)로 항목 이동, 가로 배치에서 ↑↓는 캐러셀을 벗어난다. Space·Enter로 실행.
  const visibleItems = () => [...root.querySelectorAll('[data-carousel-mode]:not([hidden]) .m3-carousel-item')];
  root.addEventListener('keydown', event => {
    const item = event.target.closest('.m3-carousel-item');
    if (!item) return;
    const items = visibleItems();
    const i = items.indexOf(item);
    const vertical = view.layout === 'full-screen';
    const next = vertical ? 'ArrowDown' : 'ArrowRight';
    const prev = vertical ? 'ArrowUp' : 'ArrowLeft';
    if (event.key === next || event.key === prev) {
      event.preventDefault();
      items[Math.max(0, Math.min(items.length - 1, i + (event.key === next ? 1 : -1)))]?.focus();
    } else if (!vertical && event.key === 'ArrowDown') {
      event.preventDefault();
      showAll.focus();
    } else if (!vertical && event.key === 'ArrowUp') {
      event.preventDefault();
      bar?.querySelector('[data-carousel-axis="layout"] [aria-checked="true"]')?.focus();
    }
  });
  // 키라인 배치에서 포커스를 받은 항목은 첫 초점 자리(center-hero는 가운데)로 스크롤한다.
  layer.addEventListener('focusin', event => {
    const item = event.target.closest('.m3-carousel-item');
    if (!item || !arrangement) return;
    const target = Math.max(0, Math.min(pMax, Number(item.dataset.index)));
    scroller.scrollTo({ left: target * pitch, behavior: reduce.matches ? 'auto' : 'smooth' });
  });
  root.addEventListener('click', event => {
    const item = event.target.closest('.m3-carousel-item');
    if (!item || item.getAttribute('aria-disabled') === 'true') return;
    if (status) status.textContent = `${item.querySelector('.m3-carousel-label').textContent} 열림`;
  });
  showAll.addEventListener('click', () => {
    const open = showAll.getAttribute('aria-expanded') !== 'true';
    showAll.setAttribute('aria-expanded', String(open));
    allList.hidden = !open;
  });
  apply();
  };
  // Saving UI 장면 — 보기 전환 없이 Multi-browse로
  document.addEventListener('saving:rendered', e => e.detail.block.querySelectorAll('[data-carousel-live]').forEach(r => bindCarousel(r, null)));
  const root = document.querySelector('[data-carousel-live]');
  const bar = document.querySelector('.carousel-controls');
  if (root && bar) bindCarousel(root, bar);
})();

// ─── Checkbox 보기 전환(Error)·부모-자식 선택·Enter 키 ───
(() => {
  const bar = document.querySelector('.checkbox-controls');
  const live = document.querySelector('[data-checkbox-live]');
  if (!bar || !live) return;
  const KEY = 'bw-checkbox-view';
  const view = { error: 'off' };
  loadView(KEY, view);
  const parent = live.querySelector('[data-checkbox-parent]');
  const children = [...live.querySelectorAll('[data-checkbox-child]')];
  const syncParent = () => {
    const state = checkboxParentState(children.map(child => child.checked));
    parent.checked = state === 'checked';
    parent.indeterminate = state === 'indeterminate';
  };
  parent.addEventListener('change', () => {
    // 자식은 아직 그대로다: 불확정·해제 → 전부 선택, 선택 → 전부 해제(브라우저가 바꾼 parent 값은 쓰지 않는다).
    const value = checkboxParentToggle(checkboxParentState(children.map(child => child.checked)));
    children.forEach(child => { child.checked = value; });
    syncParent();
  });
  children.forEach(child => child.addEventListener('change', syncParent));
  syncParent();

  // M3: Space 또는 Enter로 선택·해제(브라우저 기본은 Space만).
  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || !event.target.matches?.('.m3-checkbox-input') || event.target.disabled) return;
    event.preventDefault();
    event.target.click();
  });

  const apply = () => {
    document.querySelectorAll('[data-checkbox-error-target]').forEach(el => { el.dataset.error = view.error; });
    live.querySelectorAll('.m3-checkbox-input:not(:disabled)').forEach(input => {
      if (view.error === 'on') input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    });
    bar.querySelectorAll('[data-checkbox-axis]').forEach(group => markRadios(group, view[group.dataset.checkboxAxis]));
    saveView(KEY, view);
  };
  onIslandPick(bar, '[data-checkbox-axis]', (value, group) => { view[group.dataset.checkboxAxis] = value; apply(); });
  apply();
})();

// ─── Chips 보기 전환(Style) · 필터 선택 · 모두 보기(리플로) · input 칩 제거 · 화살표 이동 ───
(() => {
  const bar = document.querySelector('.chip-controls');
  const item = document.querySelector('[data-chip-target]');
  const live = document.querySelector('[data-chip-live]');
  if (!bar || !item || !live) return;
  const KEY = 'bw-chip-view';
  const view = { style: 'flat' };
  loadView(KEY, view);
  const status = live.querySelector('[data-chip-status]');
  const say = text => { if (status) status.textContent = text; };
  const label = chip => chip.querySelector('.m3-chip-label').textContent;

  // 칩 묶음: 묶음마다 탭 정지 하나(roving tabindex), 화살표 · Home · End로 이동
  const chipsOf = set => [...set.querySelectorAll('button.m3-chip:not([hidden]):not(:disabled)')];
  const rove = (set, target) => chipsOf(set).forEach(chip => { chip.tabIndex = chip === target ? 0 : -1; });
  live.querySelectorAll('[data-chip-set]').forEach(set => {
    rove(set, chipsOf(set)[0]);
    set.addEventListener('focusin', event => { if (event.target.matches('button.m3-chip')) rove(set, event.target); });
    set.addEventListener('keydown', event => {
      const chips = chipsOf(set);
      const i = chips.indexOf(event.target);
      if (i < 0) return;
      if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const rtl = getComputedStyle(set).direction === 'rtl';
        chips[chipNextIndex(i, chips.length, event.key, rtl)]?.focus();
      } else if ((event.key === 'Backspace' || event.key === 'Delete') && event.target.matches('[data-chip-input]')) {
        event.preventDefault();
        removeChip(event.target, set);
      }
    });
  });

  // 필터 칩: 누를 때마다 선택 토글(체크 아이콘이 앞에 나오고 여백 16 → 8)
  live.querySelectorAll('[data-chip-filter]').forEach(chip => chip.addEventListener('click', () => {
    const on = chip.getAttribute('aria-pressed') !== 'true';
    chip.setAttribute('aria-pressed', String(on));
    chip.toggleAttribute('data-lead', on);
  }));
  // 모두 보기: 넘치는 필터 줄을 여러 줄로 펼친다(M3 가로 넘침 · 리플로 방식)
  const showAll = live.querySelector('[data-chip-showall]');
  const reflow = live.querySelector('.m3-chip-set--reflow');
  showAll?.addEventListener('click', () => {
    const open = showAll.getAttribute('aria-expanded') !== 'true';
    showAll.setAttribute('aria-expanded', String(open));
    showAll.toggleAttribute('data-lead', open);
    reflow.dataset.expanded = String(open);
  });

  // input 칩: 누르거나 Backspace · Delete로 제거, 다음 칩으로 포커스
  const inputs = live.querySelector('[data-chip-inputs]');
  function removeChip(chip, set) {
    const before = chipsOf(set);
    const index = before.indexOf(chip);
    chip.hidden = true;
    const after = chipsOf(set);
    const next = chipFocusAfterRemove(index, after.length);
    say(`${label(chip)} 제거됨`);
    if (next >= 0) { rove(set, after[next]); after[next].focus(); } else live.querySelector('[data-chip-restore]')?.focus();
  }
  inputs.querySelectorAll('[data-chip-input]').forEach(chip => chip.addEventListener('click', () => removeChip(chip, inputs)));
  live.querySelector('[data-chip-restore]')?.addEventListener('click', () => {
    inputs.querySelectorAll('[data-chip-input]').forEach(chip => { chip.hidden = false; });
    rove(inputs, chipsOf(inputs)[0]);
    say('태그를 모두 복원했습니다');
  });
  live.querySelectorAll('[data-chip-action]').forEach(chip => chip.addEventListener('click', () => say(`${label(chip)} 실행`)));

  const apply = () => {
    item.dataset.chipStyle = view.style;
    bar.querySelectorAll('[data-chip-axis]').forEach(group => markRadios(group, view[group.dataset.chipAxis]));
    saveView(KEY, view);
  };
  onIslandPick(bar, '[data-chip-axis]', (value, group) => { view[group.dataset.chipAxis] = value; apply(); });
  apply();
})();

// ─── Date pickers · Time pickers — 견본 그리기(Configurations)와 라이브(Docked · Modal · Range · Time) ───
const PICKER_ICONS = {
  prev: 'M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z',
  next: 'M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z',
  drop: 'M480-360 280-560h400L480-360Z',
  edit: 'M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z',
  calendar: 'M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z',
  check: 'M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z',
  keyboard: 'M160-200q-33 0-56.5-23.5T80-280v-400q0-33 23.5-56.5T160-760h640q33 0 56.5 23.5T880-680v400q0 33-23.5 56.5T800-200H160Zm0-80h640v-400H160v400Zm160-40h320v-80H320v80ZM200-440h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80ZM200-560h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80ZM160-280v-400 400Z',
  clock: 'm612-292 56-56-148-148v-184h-80v216l172 172ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-400Zm0 320q133 0 226.5-93.5T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160Z',
};
const pickerIcon = (name, cls = '') => `<svg class="icon icon-symbol ${cls}" viewBox="0 -960 960 960" aria-hidden="true"><path d="${PICKER_ICONS[name]}"/></svg>`;
const PICKER_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const pickerDayName = date => `${PICKER_WEEKDAYS[date.getDay()]}요일`;
const pickerDayLabel = date => `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${pickerDayName(date)}`;
const pickerHeadline = date => date ? `${date.getMonth() + 1}월 ${date.getDate()}일 (${PICKER_WEEKDAYS[date.getDay()]})` : '날짜 선택';
const pickerEl = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

/**
 * 날짜 선택기 한 개를 상태에 맞춰 다시 그린다.
 * s: { variant:'docked'|'modal'|'input', view:'day'|'year'|'month', range, month(Date), selected, start, end, today, min, max, error, draft, interactive }
 */
function renderDatePicker(root, s) {
  const tab = s.interactive ? '' : ' tabindex="-1"';
  const month = s.month;
  const y = month.getFullYear(), m = month.getMonth();
  const monthName = `${m + 1}월`;
  const weekdays = `<div class="m3-dp-weekdays" role="row">${PICKER_WEEKDAYS.map((d, i) => `<span class="m3-dp-weekday" role="columnheader" title="${PICKER_WEEKDAYS[i]}요일" aria-label="${PICKER_WEEKDAYS[i]}요일">${d}</span>`).join('')}</div>`;
  const focusKey = s.focus ? calendarKey(s.focus) : null;
  const grid = (ym, { outside = false } = {}) => {
    const first = calendarDate(ym.getFullYear(), ym.getMonth(), 1);
    const lead = first.getDay();
    const days = calendarDate(ym.getFullYear(), ym.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < 42; i += 1) {
      const date = calendarDate(ym.getFullYear(), ym.getMonth(), i - lead + 1);
      const inMonth = i >= lead && i < lead + days;
      if (!inMonth && !outside) { cells.push('<span class="m3-dp-cell" role="gridcell"></span>'); continue; }
      const key = calendarKey(date);
      const selected = s.range ? (sameDay(date, s.start) || sameDay(date, s.end)) : sameDay(date, s.selected);
      let range = '';
      if (s.range && inMonth && s.start && s.end && inDateRange(date, s.start, s.end)) {
        range = sameDay(s.start, s.end) ? 'single' : sameDay(date, s.start) ? 'start' : sameDay(date, s.end) ? 'end' : 'in';
      }
      const disabled = !dateSelectable(date, s.min, s.max);
      const tabIndex = s.interactive && inMonth && key === focusKey ? '0' : '-1';
      const attrs = [
        'type="button" class="m3-dp-day"', `data-date="${key}"`, `tabindex="${tabIndex}"`,
        `aria-label="${pickerDayLabel(date)}${sameDay(date, s.today) ? ', 오늘' : ''}"`,
        selected ? 'data-selected' : '', sameDay(date, s.today) ? 'data-today aria-current="date"' : '',
        inMonth ? '' : 'data-outside', disabled ? 'disabled' : '',
      ].filter(Boolean).join(' ');
      cells.push(`<span class="m3-dp-cell" role="gridcell" aria-selected="${selected}"${range ? ` data-range="${range}"` : ''}><button ${attrs}>${date.getDate()}</button></span>`);
    }
    let rows = '';
    for (let w = 0; w < 6; w += 1) {
      const row = cells.slice(w * 7, w * 7 + 7);
      if (!outside && row.every(c => !c.includes('<button'))) continue;
      rows += `<div class="m3-dp-week" role="row">${row.join('')}</div>`;
    }
    return `<div class="m3-dp-grid" role="grid" aria-label="${ym.getFullYear()}년 ${ym.getMonth() + 1}월">${rows}</div>`;
  };
  const years = () => {
    const list = yearRange(s.minYear ?? 1926, s.maxYear ?? 2126);
    return list.map(year => {
      const sel = year === (s.selected || s.month).getFullYear() && s.view === 'year';
      return { year, sel };
    });
  };
  const actions = s.noActions ? '' : `<div class="m3-dp-actions"><button type="button" class="btn btn-text" data-dp-action="cancel"${tab}>취소</button><button type="button" class="btn btn-text" data-dp-action="ok"${tab}>확인</button></div>`;
  let html = '';
  if (s.variant === 'docked') {
    const menu = s.view === 'year' ? 'year' : s.view === 'month' ? 'month' : null;
    html += `<div class="m3-dp-nav">
      <div class="m3-dp-nav-group"><button type="button" class="m3-dp-iconbtn" data-dp-nav="-1" aria-label="이전 달"${menu ? ' disabled' : ''}${tab}>${pickerIcon('prev')}</button><button type="button" class="m3-dp-menubtn" data-dp-menu="month" aria-haspopup="listbox" aria-expanded="${menu === 'month'}" aria-label="월 선택, ${monthName}"${menu === 'year' ? ' disabled' : ''}${tab}>${monthName}${pickerIcon('drop', 'm3-dp-arrow')}</button><button type="button" class="m3-dp-iconbtn" data-dp-nav="1" aria-label="다음 달"${menu ? ' disabled' : ''}${tab}>${pickerIcon('next')}</button></div>
      <div class="m3-dp-nav-group"><button type="button" class="m3-dp-iconbtn" data-dp-nav="-12" aria-label="이전 해"${menu ? ' disabled' : ''}${tab}>${pickerIcon('prev')}</button><button type="button" class="m3-dp-menubtn" data-dp-menu="year" aria-haspopup="listbox" aria-expanded="${menu === 'year'}" aria-label="연도 선택, ${y}년"${menu === 'month' ? ' disabled' : ''}${tab}>${y}${pickerIcon('drop', 'm3-dp-arrow')}</button><button type="button" class="m3-dp-iconbtn" data-dp-nav="12" aria-label="다음 해"${menu ? ' disabled' : ''}${tab}>${pickerIcon('next')}</button></div>
    </div>`;
    if (menu === 'year') {
      html += `<ul class="m3-dp-menu" role="listbox" aria-label="연도">${yearRange(s.minYear ?? 1926, s.maxYear ?? 2126).map(year => `<li role="option" class="m3-dp-menuitem" data-dp-year="${year}" aria-selected="${year === y}" tabindex="${s.interactive && year === y ? 0 : -1}">${pickerIcon('check', 'm3-dp-check')}${year}</li>`).join('')}</ul>`;
    } else if (menu === 'month') {
      html += `<ul class="m3-dp-menu" role="listbox" aria-label="월">${Array.from({ length: 12 }, (_, i) => `<li role="option" class="m3-dp-menuitem" data-dp-month="${i}" aria-selected="${i === m}" tabindex="${s.interactive && i === m ? 0 : -1}">${pickerIcon('check', 'm3-dp-check')}${i + 1}월</li>`).join('')}</ul>`;
    } else {
      html += `<div class="m3-dp-body">${weekdays}${grid(month, { outside: true })}</div>${actions}`;
    }
  } else if (s.variant === 'input') {
    const value = s.draft ?? (s.selected ? formatDateInput(s.selected) : '');
    html += `<div class="m3-dp-header"><span class="m3-dp-supporting">날짜 입력</span><span class="m3-dp-headline">${pickerHeadline(s.selected)}</span><button type="button" class="m3-dp-iconbtn" data-dp-mode="calendar" aria-label="달력으로 전환"${tab}>${pickerIcon('calendar')}</button></div><div class="m3-dp-divider"></div>
      <div class="m3-dp-inputbody"><div class="m3-tf" data-variant="outlined"${value ? ' data-populated' : ''}${s.error ? ' data-error' : ''}${s.fieldState ? ` data-state="${s.fieldState}"` : ''}><div class="m3-tf-field"><fieldset class="m3-tf-outline" aria-hidden="true"><legend><span>날짜</span></legend></fieldset><label class="m3-tf-label" for="${s.id}-input">날짜</label><span class="m3-tf-body"><input class="m3-tf-input" id="${s.id}-input" data-dp-input type="text" inputmode="numeric" autocomplete="off" value="${value}" placeholder="YYYY/MM/DD" aria-describedby="${s.id}-support"${s.error ? ' aria-invalid="true"' : ''}${tab}></span></div><div class="m3-tf-support"><span class="m3-tf-support-text" id="${s.id}-support">${s.error ? '날짜를 YYYY/MM/DD 형식으로 입력해 주세요' : 'YYYY/MM/DD'}</span></div></div></div>${actions}`;
  } else {
    const headline = s.range
      ? (s.start ? `${s.start.getMonth() + 1}월 ${s.start.getDate()}일 – ${s.end ? `${s.end.getMonth() + 1}월 ${s.end.getDate()}일` : '종료일'}` : '시작일 – 종료일')
      : pickerHeadline(s.selected);
    html += `<div class="m3-dp-header"><span class="m3-dp-supporting">${s.range ? '기간 선택' : '날짜 선택'}</span><span class="m3-dp-headline" aria-live="polite">${headline}</span>${s.range ? '' : `<button type="button" class="m3-dp-iconbtn" data-dp-mode="input" aria-label="직접 입력으로 전환"${tab}>${pickerIcon('edit')}</button>`}</div><div class="m3-dp-divider"></div>`;
    if (s.range) {
      html += `${weekdays}<div class="m3-dp-months">${[0, 1, 2].map(i => { const mm = calendarDate(y, m + i, 1); return `<div class="m3-dp-month-subhead">${mm.getFullYear()}년 ${mm.getMonth() + 1}월</div><div class="m3-dp-body">${grid(mm)}</div>`; }).join('')}</div>${actions}`;
    } else {
      html += `<div class="m3-dp-nav"><button type="button" class="m3-dp-menubtn" data-dp-menu="year" aria-haspopup="true" aria-expanded="${s.view === 'year'}" aria-label="연도 선택, ${y}년 ${monthName}"${tab}>${y}년 ${monthName}${pickerIcon('drop', 'm3-dp-arrow')}</button>${s.view === 'year' ? '' : `<div class="m3-dp-nav-group"><button type="button" class="m3-dp-iconbtn" data-dp-nav="-1" aria-label="이전 달"${tab}>${pickerIcon('prev')}</button><button type="button" class="m3-dp-iconbtn" data-dp-nav="1" aria-label="다음 달"${tab}>${pickerIcon('next')}</button></div>`}</div>`;
      if (s.view === 'year') {
        html += `<div class="m3-dp-years" role="radiogroup" aria-label="연도">${yearRange(s.minYear ?? 1926, s.maxYear ?? 2126).map(year => `<button type="button" class="m3-dp-year" role="radio" data-dp-year="${year}" aria-checked="${year === y}"${year === y ? ' data-selected' : ''}${year === s.today?.getFullYear() ? ' data-today' : ''} tabindex="${s.interactive && year === y ? 0 : -1}">${year}</button>`).join('')}</div>${actions}`;
      } else {
        html += `<div class="m3-dp-body">${weekdays}${grid(month)}</div>${actions}`;
      }
    }
  }
  root.classList.add('m3-dp');
  root.dataset.variant = s.variant;
  root.toggleAttribute('data-range', !!s.range);
  root.innerHTML = html;
  centerPickerList(root);
}

/** 연·월 목록을 선택 항목이 가운데 오도록 스크롤한다(보이지 않을 때는 크기가 0이라 보일 때 다시 부른다). */
function centerPickerList(root) {
  const list = root.querySelector('.m3-dp-years, .m3-dp-menu');
  const sel = list?.querySelector('[aria-checked="true"], [aria-selected="true"]');
  if (!list || !sel) return;
  const top = sel.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
  list.scrollTop = top - list.clientHeight / 2 + sel.offsetHeight / 2;
}

/** 시간 선택기 그리기. t: { variant:'dial'|'input', layout, is24h, hour(0–23), minute, mode:'hour'|'minute', interactive, fieldState } */
function renderTimePicker(root, t) {
  const tab = t.interactive ? '' : ' tabindex="-1"';
  const { hour12, period } = from24Hour(t.hour);
  const shownHour = t.is24h ? pad2(t.hour) : pad2(hour12);
  const periodHtml = t.is24h ? '' : `<div class="m3-tp-period" role="radiogroup" aria-label="오전·오후">${['AM', 'PM'].map(p => `<button type="button" class="m3-tp-period-btn" role="radio" data-tp-period="${p}" aria-checked="${p === period}" tabindex="${t.interactive ? (p === period ? 0 : -1) : -1}">${p === 'AM' ? '오전' : '오후'}</button>`).join('')}</div>`;
  let display;
  if (t.variant === 'input') {
    const field = (mode, value, label) => `<label class="m3-tp-field"${t.errors?.[mode] ? ' data-error' : ''}${t.fieldState?.[mode] ? ` data-state="${t.fieldState[mode]}"` : ''}><input class="m3-tp-field-input" type="text" inputmode="numeric" maxlength="2" autocomplete="off" data-tp-field="${mode}" value="${value}" aria-label="${label}"${tab}><span class="m3-tp-field-support" aria-hidden="true">${label}</span></label>`;
    display = `<div class="m3-tp-display"><div class="m3-tp-fields">${field('hour', t.draftHour ?? shownHour, '시')}<span class="m3-tp-sep" aria-hidden="true">:</span>${field('minute', t.draftMinute ?? pad2(t.minute), '분')}</div>${periodHtml}</div>`;
  } else {
    display = `<div class="m3-tp-display"><div class="m3-tp-fields"><button type="button" class="m3-tp-selector" data-tp-select="hour" aria-pressed="${t.mode === 'hour'}" aria-label="시 ${shownHour}"${tab}>${shownHour}</button><span class="m3-tp-sep" aria-hidden="true">:</span><button type="button" class="m3-tp-selector" data-tp-select="minute" aria-pressed="${t.mode === 'minute'}" aria-label="분 ${pad2(t.minute)}"${tab}>${pad2(t.minute)}</button></div>${periodHtml}</div>`;
  }
  let dial = '';
  if (t.variant === 'dial') {
    const values = t.mode === 'minute' ? [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] : t.is24h ? [...Array(24).keys()] : [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const current = t.mode === 'minute' ? t.minute : t.is24h ? t.hour : hour12;
    const pos = dialLabelPosition(current, t.mode, { is24h: t.is24h });
    const nums = values.map(v => {
      const p = dialLabelPosition(v, t.mode, { is24h: t.is24h });
      const label = t.mode === 'minute' ? pad2(v) : t.is24h ? pad2(v) : String(v);
      const on = v === current;
      const total = t.mode === 'minute' ? '60' : t.is24h ? '24' : '12';
      return `<button type="button" class="m3-tp-num" role="radio" style="--x:${p.x}px;--y:${p.y}px" data-tp-value="${v}" aria-checked="${on}" aria-label="${t.mode === 'minute' ? `${v}분` : `${v}시`}, ${total} 중" tabindex="${t.interactive && on ? 0 : -1}">${label}</button>`;
    }).join('');
    dial = `<div class="m3-tp-dial" data-tp-dial role="radiogroup" aria-label="${t.mode === 'minute' ? '분 선택' : '시 선택'}" style="--tp-angle:${dialAngle(current, t.mode)}deg;--tp-hand-len:${pos.r}px;--tp-hx:${pos.x}px;--tp-hy:${pos.y}px"><span class="m3-tp-hand"></span><span class="m3-tp-handle"></span><span class="m3-tp-center"></span>${nums}</div>`;
  }
  const toggle = t.variant === 'dial'
    ? `<button type="button" class="m3-dp-iconbtn" data-tp-mode="input" aria-label="입력 방식으로 전환"${tab}>${pickerIcon('keyboard')}</button>`
    : `<button type="button" class="m3-dp-iconbtn" data-tp-mode="dial" aria-label="다이얼로 전환"${tab}>${pickerIcon('clock')}</button>`;
  root.classList.add('m3-tp');
  root.dataset.variant = t.variant;
  root.dataset.layout = t.layout || 'vertical';
  root.toggleAttribute('data-24h', !!t.is24h);
  root.setAttribute('role', t.interactive ? 'group' : 'presentation');
  if (t.interactive) root.setAttribute('aria-label', t.variant === 'input' ? '시간 입력' : '시간 선택');
  root.innerHTML = `<div class="m3-tp-headline">${t.variant === 'input' ? '시간 입력' : '시간 선택'}</div><div class="m3-tp-main">${display}${dial}</div><div class="m3-tp-actions">${toggle}<button type="button" class="btn btn-text" data-tp-action="cancel"${tab}>취소</button><button type="button" class="btn btn-text" data-tp-action="ok"${tab}>확인</button></div>`;
}

// 견본(Configurations) — 고정 상태로 그린다(inert)
(() => {
  const today = calendarDate(2026, 8, 17);
  document.querySelectorAll('[data-dp-sample]').forEach((el, i) => {
    const [variant, view = 'day'] = el.dataset.dpSample.split(':');
    const base = { id: `dp-sample-${i}`, today, month: calendarDate(2026, 8, 1), selected: calendarDate(2026, 8, 24), minYear: 2020, maxYear: 2037 };
    if (variant === 'range') renderDatePicker(el, { ...base, variant: 'modal', range: true, month: calendarDate(2026, 7, 1), start: calendarDate(2026, 7, 17), end: calendarDate(2026, 7, 23), selected: null });
    else renderDatePicker(el, { ...base, variant, view });
  });
  document.querySelectorAll('[data-tp-sample]').forEach(el => {
    const [variant, layout = 'vertical', clock = '12'] = el.dataset.tpSample.split(':');
    renderTimePicker(el, { variant, layout, is24h: clock === '24', hour: clock === '24' ? 19 : 7, minute: 0, mode: 'hour', fieldState: variant === 'input' ? { hour: 'focus' } : null });
  });
  const lists = [...document.querySelectorAll('[data-dp-sample]')].filter(el => el.querySelector('.m3-dp-years, .m3-dp-menu'));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) centerPickerList(e.target); }));
    lists.forEach(el => io.observe(el));
  }
})();

// 라이브 — Docked(입력 칸 + 달력 펼침), Modal(달력 ↔ 직접 입력), Range(기간), Time(다이얼 ↔ 입력)
(() => {
  const live = document.querySelector('[data-picker-live]');
  if (!live) return;
  const today = calendarDate(2026, 8, 27);
  const say = (text, which = 'date') => { const el = document.querySelector(`[data-picker-status="${which}"]`); if (el) el.textContent = text; };
  const rtlOf = el => getComputedStyle(el).direction === 'rtl';

  // 달력 공통 조작: 날짜 클릭, 화살표 · Home/End · PageUp/Down(Shift는 해), 이전·다음, 연·월 메뉴
  function wireCalendar(root, state, { onPick, onCommit, onCancel, onMode, rerender }) {
    root.addEventListener('click', event => {
      const day = event.target.closest('.m3-dp-day:not(:disabled)');
      const nav = event.target.closest('[data-dp-nav]');
      const menu = event.target.closest('[data-dp-menu]');
      const year = event.target.closest('[data-dp-year]');
      const month = event.target.closest('[data-dp-month]');
      const action = event.target.closest('[data-dp-action]');
      const mode = event.target.closest('[data-dp-mode]');
      if (day) {
        const [yy, mm, dd] = day.dataset.date.split('-').map(Number);
        const date = calendarDate(yy, mm - 1, dd);
        state.focus = date;
        if (date.getMonth() !== state.month.getMonth() && !state.range) state.month = calendarDate(yy, mm - 1, 1);
        onPick(date);
        rerender(true);
      } else if (nav) {
        state.month = shiftCalendarMonth(state.month, Number(nav.dataset.dpNav));
        state.focus = shiftCalendarMonth(state.focus, Number(nav.dataset.dpNav));
        rerender(false);
        say(`${state.month.getFullYear()}년 ${state.month.getMonth() + 1}월`);
      } else if (menu) {
        state.lastMenu = menu.dataset.dpMenu;
        state.view = state.view === menu.dataset.dpMenu ? 'day' : menu.dataset.dpMenu;
        rerender(state.view !== 'day' ? 'menu' : 'menubtn');
      } else if (year) {
        state.lastMenu = 'year';
        state.month = calendarDate(Number(year.dataset.dpYear), state.month.getMonth(), 1);
        state.focus = shiftCalendarMonth(state.focus, (state.month.getFullYear() - state.focus.getFullYear()) * 12);
        state.view = 'day';
        rerender('menubtn');
      } else if (month) {
        state.lastMenu = 'month';
        state.month = calendarDate(state.month.getFullYear(), Number(month.dataset.dpMonth), 1);
        state.focus = calendarDate(state.month.getFullYear(), state.month.getMonth(), Math.min(state.focus.getDate(), 28));
        state.view = 'day';
        rerender('menubtn');
      } else if (action) {
        (action.dataset.dpAction === 'ok' ? onCommit : onCancel)();
      } else if (mode) {
        onMode(mode.dataset.dpMode);
      }
    });
    root.addEventListener('keydown', event => {
      const day = event.target.closest('.m3-dp-day');
      if (day) {
        const [yy, mm, dd] = day.dataset.date.split('-').map(Number);
        const target = datePickerKeyTarget(calendarDate(yy, mm - 1, dd), event.key, { shift: event.shiftKey, rtl: rtlOf(root) });
        if (target) {
          event.preventDefault();
          state.focus = target;
          if (!state.range) state.month = calendarDate(target.getFullYear(), target.getMonth(), 1);
          else if (target < state.month) state.month = calendarDate(target.getFullYear(), target.getMonth(), 1);
          rerender(true);
          return;
        }
        if (event.key === 'Enter' && !state.range && state.selected && sameDay(state.selected, calendarDate(yy, mm - 1, dd))) { event.preventDefault(); onCommit(); return; }
      }
      // Shift+M · Shift+Y — 월 · 연 메뉴로(M3 Accessibility)
      if (event.shiftKey && (event.key === 'M' || event.key === 'Y')) {
        const target = root.querySelector(event.key === 'M' ? '[data-dp-menu="month"]' : '[data-dp-menu="year"]') || root.querySelector('[data-dp-menu]');
        if (target && !event.target.matches('input')) { event.preventDefault(); target.focus(); }
      }
      // 연 · 월 목록: 위아래 화살표로 이동, Enter · Space로 선택
      const option = event.target.closest('.m3-dp-menuitem, .m3-dp-year');
      if (option) {
        const list = [...option.parentElement.children];
        const i = list.indexOf(option);
        const step = { ArrowDown: option.classList.contains('m3-dp-year') ? 3 : 1, ArrowUp: option.classList.contains('m3-dp-year') ? -3 : -1, ArrowRight: 1, ArrowLeft: -1 }[event.key];
        if (step) {
          event.preventDefault();
          const next = list[Math.max(0, Math.min(list.length - 1, i + step))];
          option.tabIndex = -1; next.tabIndex = 0; next.focus(); next.scrollIntoView({ block: 'nearest' });
        } else if ((event.key === 'Enter' || event.key === ' ') && option.matches('li')) {
          event.preventDefault(); option.click();
        } else if (event.key === 'Escape' && state.view !== 'day') {
          event.preventDefault(); event.stopPropagation(); state.view = 'day'; rerender('menubtn');
        }
      }
    });
  }
  // 다시 그린 뒤 포커스: 날짜 · 목록 항목 · 방금 닫은 메뉴 버튼
  const focusAfter = (root, how, state) => {
    if (how === true) root.querySelector('.m3-dp-day[tabindex="0"]')?.focus();
    else if (how === 'menu') root.querySelector('.m3-dp-menuitem[tabindex="0"], .m3-dp-year[tabindex="0"]')?.focus();
    else if (how === 'menubtn') (root.querySelector(`.m3-dp-menubtn[data-dp-menu="${state?.lastMenu}"]`) || root.querySelector('.m3-dp-menubtn'))?.focus();
  };

  // 날짜 입력 칸은 Text fields(4.8.1)의 outlined 필드 — 내용이 있으면 라벨을 올린다
  const syncPopulated = input => input.closest('.m3-tf')?.toggleAttribute('data-populated', input.value.length > 0);
  document.addEventListener('input', event => { if (event.target.matches?.('[data-dp-input]')) syncPopulated(event.target); });
  // Docked — 입력 칸이 기본, 달력 아이콘으로 아래에 달력을 펼친다
  const docked = live.querySelector('[data-dp-docked]');
  if (docked) {
    const field = docked.querySelector('.m3-tf');
    const input = docked.querySelector('[data-dp-input]');
    const toggle = docked.querySelector('[data-dp-open]');
    const support = docked.querySelector('.m3-tf-support-text');
    const panel = docked.querySelector('.m3-dp-panel');
    const state = { id: 'dp-live-docked', variant: 'docked', view: 'day', today, month: calendarDate(2026, 8, 1), selected: null, focus: today, interactive: true, minYear: 1926, maxYear: 2126 };
    const draw = how => { renderDatePicker(panel, state); focusAfter(panel, how, state); };
    const open = () => { state.view = 'day'; const base = state.selected || today; state.month = calendarDate(base.getFullYear(), base.getMonth(), 1); state.focus = base; panel.hidden = false; toggle.setAttribute('aria-expanded', 'true'); draw(true); };
    const close = (restore = true) => { panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); if (restore) toggle.focus(); };
    const setError = on => { field.toggleAttribute('data-error', on); input.setAttribute('aria-invalid', String(on)); support.textContent = on ? '날짜를 YYYY/MM/DD 형식으로 입력해 주세요' : 'YYYY/MM/DD'; };
    const commitText = () => {
      if (!input.value.trim()) { state.selected = null; setError(false); return; }
      const date = parseDateInput(input.value);
      setError(!date);
      if (date) { state.selected = date; input.value = formatDateInput(date); syncPopulated(input); say(`${pickerDayLabel(date)} 입력됨`); }
    };
    input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); commitText(); } });
    input.addEventListener('change', commitText);
    toggle.addEventListener('click', () => (panel.hidden ? open() : close()));
    wireCalendar(panel, state, {
      onPick: date => { state.selected = date; },
      onCommit: () => { if (state.selected) { input.value = formatDateInput(state.selected); syncPopulated(input); setError(false); say(`${pickerDayLabel(state.selected)} 선택됨`); } close(); },
      onCancel: () => close(),
      onMode: () => {},
      rerender: draw,
    });
    docked.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); close(); } });
    document.addEventListener('pointerdown', event => { if (!panel.hidden && !docked.contains(event.target)) close(false); });
  }

  // Modal · Range — <dialog>로 연다. 취소 · Esc · 바깥 누르기로 닫고, 연 버튼으로 포커스를 돌려준다
  const openDialog = (dialog, opener, onClose) => {
    dialog.showModal();
    const handler = () => { dialog.removeEventListener('close', handler); onClose?.(); opener.focus(); };
    dialog.addEventListener('close', handler);
  };
  document.querySelectorAll('.m3-dp-dialog, .m3-tp-dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));

  const modalBtn = live.querySelector('[data-dp-modal-open]');
  const modalDialog = document.querySelector('[data-dp-modal-dialog]');
  if (modalBtn && modalDialog) {
    const root = modalDialog.querySelector('.m3-dp-root');
    const result = live.querySelector('[data-dp-modal-result]');
    let committed = null;
    const state = { id: 'dp-live-modal', variant: 'modal', view: 'day', today, interactive: true, minYear: 1926, maxYear: 2126 };
    const draw = how => { renderDatePicker(root, state); focusAfter(root, how, state); if (how === 'input') root.querySelector('[data-dp-input]')?.focus(); };
    wireCalendar(root, state, {
      onPick: date => { state.selected = date; },
      onCommit: () => {
        if (state.variant === 'input') {
          const date = parseDateInput(root.querySelector('[data-dp-input]').value);
          if (!date) { state.error = true; state.draft = root.querySelector('[data-dp-input]').value; draw('input'); return; }
          state.selected = date;
        }
        committed = state.selected;
        result.textContent = committed ? pickerDayLabel(committed) : '선택 안 함';
        modalDialog.close();
      },
      onCancel: () => modalDialog.close(),
      onMode: mode => {
        if (mode === 'input') { state.variant = 'input'; state.draft = null; state.error = false; draw('input'); }
        else {
          const date = parseDateInput(root.querySelector('[data-dp-input]').value);
          if (date) { state.selected = date; state.focus = date; state.month = calendarDate(date.getFullYear(), date.getMonth(), 1); }
          state.variant = 'modal'; state.view = 'day'; draw(true);
        }
      },
      rerender: draw,
    });
    root.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.matches('[data-dp-input]')) { event.preventDefault(); const date = parseDateInput(event.target.value); state.error = !date; state.draft = date ? formatDateInput(date) : event.target.value; if (date) state.selected = date; draw('input'); } });
    modalBtn.addEventListener('click', () => {
      Object.assign(state, { variant: 'modal', view: 'day', selected: committed, error: false, draft: null });
      const base = committed || today;
      state.focus = base; state.month = calendarDate(base.getFullYear(), base.getMonth(), 1);
      openDialog(modalDialog, modalBtn);
      draw(true);
    });
  }

  const rangeBtn = live.querySelector('[data-dp-range-open]');
  const rangeDialog = document.querySelector('[data-dp-range-dialog]');
  if (rangeBtn && rangeDialog) {
    const root = rangeDialog.querySelector('.m3-dp-root');
    const result = live.querySelector('[data-dp-range-result]');
    let committed = { start: null, end: null };
    const state = { id: 'dp-live-range', variant: 'modal', range: true, view: 'day', today, interactive: true };
    const draw = how => {
      const scroll = root.querySelector('.m3-dp-months')?.scrollTop ?? 0;
      renderDatePicker(root, state);
      const months = root.querySelector('.m3-dp-months');
      if (months) months.scrollTop = scroll;
      // 격자 셋을 하나의 탭 정지로: 초점 날짜가 없는 격자는 첫 칸을 -1로 둔다
      const focusBtn = root.querySelector(`.m3-dp-day[data-date="${calendarKey(state.focus)}"]`);
      root.querySelectorAll('.m3-dp-day').forEach(b => { b.tabIndex = b === focusBtn ? 0 : -1; });
      if (how === true) { focusBtn?.focus(); focusBtn?.scrollIntoView({ block: 'nearest' }); }
    };
    wireCalendar(root, state, {
      onPick: date => { Object.assign(state, nextRangeSelection(state, date)); say(state.end ? '기간 선택됨' : `${pickerDayLabel(date)} 시작일`); },
      onCommit: () => {
        if (!state.end) { say('종료일을 골라 주세요'); return; }
        committed = { start: state.start, end: state.end };
        result.textContent = `${pickerDayLabel(committed.start)} – ${pickerDayLabel(committed.end)}`;
        rangeDialog.close();
      },
      onCancel: () => rangeDialog.close(),
      onMode: () => {},
      rerender: draw,
    });
    rangeBtn.addEventListener('click', () => {
      Object.assign(state, { start: committed.start, end: committed.end, focus: committed.start || today });
      state.month = calendarDate((committed.start || today).getFullYear(), (committed.start || today).getMonth(), 1);
      openDialog(rangeDialog, rangeBtn);
      draw(true);
    });
  }

  // Time — 다이얼(누르기 · 끌기, 시 선택 뒤 분으로 자동 전환) ↔ 입력(칸마다 검증), 오전·오후
  const bindTime = (time, t, result) => {
    const sayTime = text => say(text, 'time');
    let saved = { hour: t.hour, minute: t.minute };
    const draw = focusSel => {
      renderTimePicker(time, t);
      if (focusSel) time.querySelector(focusSel)?.focus();
    };
    const setFromDial = (value, final) => {
      if (t.mode === 'minute') t.minute = value;
      else t.hour = t.is24h ? value : to24Hour(value, from24Hour(t.hour).period);
      if (final && t.mode === 'hour') { t.mode = 'minute'; sayTime(`${from24Hour(t.hour).hour12}시 선택, 분을 고르세요`); }
    };
    const pointValue = (event, dial) => {
      const r = dial.getBoundingClientRect();
      return dialValueAt(event.clientX - r.left - r.width / 2, event.clientY - r.top - r.height / 2, t.mode, { is24h: t.is24h });
    };
    let dragging = false;
    time.addEventListener('pointerdown', event => {
      const dial = event.target.closest('[data-tp-dial]');
      if (!dial || event.button !== 0) return;
      event.preventDefault();
      dragging = true;
      dial.setPointerCapture?.(event.pointerId);
      setFromDial(pointValue(event, dial), false);
      draw();
    });
    time.addEventListener('pointermove', event => {
      if (!dragging) return;
      const dial = time.querySelector('[data-tp-dial]');
      const v = pointValue(event, dial);
      const current = t.mode === 'minute' ? t.minute : t.is24h ? t.hour : from24Hour(t.hour).hour12;
      if (v !== current) { setFromDial(v, false); draw(); }
    });
    time.addEventListener('pointerup', event => {
      if (!dragging) return;
      dragging = false;
      const dial = time.querySelector('[data-tp-dial]');
      setFromDial(pointValue(event, dial), true);
      draw('.m3-tp-num[tabindex="0"]');
    });
    time.addEventListener('click', event => {
      const sel = event.target.closest('[data-tp-select]');
      const per = event.target.closest('[data-tp-period]');
      const mode = event.target.closest('[data-tp-mode]');
      const action = event.target.closest('[data-tp-action]');
      const num = event.target.closest('.m3-tp-num');
      if (num && event.detail === 0) { setFromDial(Number(num.dataset.tpValue), true); draw('.m3-tp-num[tabindex="0"]'); }
      else if (sel) { t.mode = sel.dataset.tpSelect; draw(`[data-tp-select="${t.mode}"]`); }
      else if (per) { const h12 = from24Hour(t.hour).hour12; t.hour = to24Hour(h12, per.dataset.tpPeriod); draw(`[data-tp-period="${per.dataset.tpPeriod}"]`); }
      else if (mode) { t.variant = mode.dataset.tpMode; t.draftHour = t.draftMinute = undefined; t.errors = null; draw(t.variant === 'input' ? '[data-tp-field="hour"]' : '[data-tp-mode]'); }
      else if (action) {
        if (action.dataset.tpAction === 'ok') {
          if (t.variant === 'input' && t.errors && (t.errors.hour || t.errors.minute)) { sayTime('시간을 확인해 주세요'); return; }
          saved = { hour: t.hour, minute: t.minute };
          const { hour12, period } = from24Hour(t.hour);
          const label = `${period === 'AM' ? '오전' : '오후'} ${hour12}:${pad2(t.minute)}`;
          if (result) result.textContent = label;
          sayTime(`${label} 설정됨`);
        } else { t.hour = saved.hour; t.minute = saved.minute; t.mode = 'hour'; draw('[data-tp-action="cancel"]'); sayTime('취소됨'); }
      }
    });
    time.addEventListener('keydown', event => {
      const num = event.target.closest('.m3-tp-num');
      if (num) {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
        if (step) {
          event.preventDefault();
          const count = t.mode === 'minute' ? 60 : t.is24h ? 24 : 12;
          const current = t.mode === 'minute' ? t.minute : t.is24h ? t.hour : from24Hour(t.hour).hour12 % 12;
          const nextRaw = (current + step + count) % count;
          setFromDial(t.mode === 'hour' && !t.is24h && nextRaw === 0 ? 12 : nextRaw, false);
          draw();
          const btn = time.querySelector('.m3-tp-num[tabindex="0"]') || time.querySelector('[data-tp-dial]');
          (btn || time).focus();
          if (!btn) time.querySelectorAll('.m3-tp-num').forEach((b, i) => { if (i === 0) { b.tabIndex = 0; b.focus(); } });
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault(); setFromDial(Number(num.dataset.tpValue), true); draw('.m3-tp-num[tabindex="0"]');
        }
      }
      const per = event.target.closest('[data-tp-period]');
      if (per && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        const next = per.dataset.tpPeriod === 'AM' ? 'PM' : 'AM';
        t.hour = to24Hour(from24Hour(t.hour).hour12, next);
        draw(`[data-tp-period="${next}"]`);
      }
    });
    time.addEventListener('input', event => {
      const f = event.target.closest('[data-tp-field]');
      if (!f) return;
      const mode = f.dataset.tpField;
      const v = parseTimeField(f.value, mode, { is24h: t.is24h });
      t.errors = { ...(t.errors || {}), [mode]: v === null };
      f.closest('.m3-tp-field').toggleAttribute('data-error', v === null);
      f.setAttribute('aria-invalid', String(v === null));
      if (v !== null) {
        if (mode === 'minute') t.minute = v; else t.hour = t.is24h ? v : to24Hour(v, from24Hour(t.hour).period);
        if (mode === 'hour' && f.value.length === 2) time.querySelector('[data-tp-field="minute"]')?.focus();
      }
      if (mode === 'hour') t.draftHour = f.value; else t.draftMinute = f.value;
    });
    // 입력 칸에 들어오면 전체 선택 — 두 자리를 바로 덮어쓴다
    time.addEventListener('focusin', event => { if (event.target.matches('[data-tp-field]')) event.target.select(); });
    time.addEventListener('focusout', event => {
      const f = event.target.closest('[data-tp-field]');
      if (!f || t.errors?.[f.dataset.tpField]) return;
      f.value = f.dataset.tpField === 'minute' ? pad2(t.minute) : pad2(t.is24h ? t.hour : from24Hour(t.hour).hour12);
    });
    draw();
    if (result) { const { hour12, period } = from24Hour(t.hour); result.textContent = `${period === 'AM' ? '오전' : '오후'} ${hour12}:${pad2(t.minute)}`; }
  };
  const time = document.querySelector('[data-tp-live]');
  if (time) bindTime(time, { variant: 'dial', layout: 'vertical', is24h: false, hour: 9, minute: 30, mode: 'hour', interactive: true }, document.querySelector('[data-tp-result]'));

  // Saving UI 장면 — 창을 띄우지 않고 그 자리에서 고른다(확인 · 취소 · 달력 ↔ 입력 전환)
  const bindDateInline = (root, variant, id) => {
    const start = calendarDate(2026, 8, 24);
    const state = { id, variant, view: 'day', today, month: calendarDate(2026, 8, 1), selected: start, focus: start, interactive: true, minYear: 1926, maxYear: 2126 };
    let committed = start;
    const draw = how => { renderDatePicker(root, state); focusAfter(root, how, state); if (how === 'input') root.querySelector('[data-dp-input]')?.focus(); };
    const readInput = () => {
      const field = root.querySelector('[data-dp-input]');
      const date = parseDateInput(field.value);
      state.error = !date; state.draft = date ? formatDateInput(date) : field.value;
      if (date) state.selected = date;
      return date;
    };
    wireCalendar(root, state, {
      onPick: date => { state.selected = date; },
      onCommit: () => {
        if (state.variant === 'input' && !readInput()) { draw('input'); return; }
        committed = state.selected;
        state.error = false; state.draft = null;
        say(committed ? `${pickerDayLabel(committed)} 선택됨` : '선택 안 함');
        draw();
      },
      onCancel: () => { state.selected = committed; state.error = false; state.draft = null; if (committed) { state.focus = committed; state.month = calendarDate(committed.getFullYear(), committed.getMonth(), 1); } draw(); say('취소됨'); },
      onMode: mode => {
        if (mode === 'input') { state.variant = 'input'; state.draft = null; state.error = false; draw('input'); }
        else {
          const date = parseDateInput(root.querySelector('[data-dp-input]').value);
          if (date) { state.selected = date; state.focus = date; state.month = calendarDate(date.getFullYear(), date.getMonth(), 1); }
          state.variant = 'modal'; state.view = 'day'; draw(true);
        }
      },
      rerender: draw,
    });
    root.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.matches('[data-dp-input]')) { event.preventDefault(); readInput(); draw('input'); } });
    draw();
  };
  document.addEventListener('saving:rendered', e => e.detail.block.querySelectorAll('[data-saving-picker]').forEach((el, i) => {
    const [picker, variant] = el.dataset.savingPicker.split(':');
    if (picker === 'date') bindDateInline(el, variant, `saving-dp-${e.detail.block.dataset.saving}-${i}`);
    else bindTime(el, { variant, layout: 'vertical', is24h: false, hour: 7, minute: 0, mode: 'hour', interactive: true }, null);
  }));
})();

// ─── Dialogs 라이브 — 네이티브 <dialog> 모달, 첫 대상 포커스 · Tab 순환 · Esc, 목록 선택 전 확인 비활성,
//     전체 화면은 저장 안 한 변경이 있으면 닫기 전에 Basic 대화상자로 확인 ───
(() => {
  const live = document.querySelector('[data-dialog-live]');
  if (!live) return;
  const result = live.querySelector('[data-dialog-result]');
  const status = live.querySelector('[data-dialog-status]');
  const say = text => { if (status) status.textContent = text; };
  const focusables = dialog => [...dialog.querySelectorAll(DIALOG_FOCUSABLE)].filter(el => el.getClientRects().length);
  const open = (dialog, opener) => {
    dialog.returnValue = '';
    dialog.showModal();
    // M3: 대화상자가 열리면 첫 번째 상호작용 요소로 포커스
    focusables(dialog)[0]?.focus();
    dialog.addEventListener('close', () => opener?.focus(), { once: true });
  };
  document.querySelectorAll('dialog.m3-dialog-host').forEach(dialog => {
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const items = focusables(dialog);
      const next = dialogTabTarget(items.indexOf(document.activeElement), items.length, event.shiftKey);
      if (next >= 0) { event.preventDefault(); items[next].focus(); }
    });
    // 바깥(스크림) 누르기로 닫기 — 전체 화면은 스크림이 없다
    dialog.addEventListener('click', event => { if (event.target === dialog && !dialog.hasAttribute('data-fullscreen')) dialog.close('cancel'); });
  });

  const basic = document.getElementById('dlg-live-basic');
  const list = document.getElementById('dlg-live-list');
  const full = document.getElementById('dlg-live-full');
  const discard = document.getElementById('dlg-live-discard');
  live.querySelectorAll('[data-dialog-open]').forEach(button => button.addEventListener('click', () => {
    const dialog = document.getElementById(button.dataset.dialogOpen);
    if (dialog === list) {
      list.querySelectorAll('input[type="radio"]').forEach(input => { input.checked = false; });
      list.querySelector('[data-dialog-confirm]').disabled = true;
    }
    if (dialog === full) {
      full.querySelector('form').reset();
      full.dataset.initial = JSON.stringify(Object.fromEntries(new FormData(full.querySelector('form'))));
      full.querySelector('[data-dialog-scroll]').scrollTop = 0;
      full.querySelector('.m3-dialog').removeAttribute('data-scrolled');
    }
    open(dialog, button);
  }));

  basic?.addEventListener('close', () => {
    result.textContent = basic.returnValue === 'confirm' ? '기록 12건 삭제됨' : '삭제 취소';
    say(result.textContent);
  });

  // 목록: 고르기 전에는 확인(적용) 비활성 — 취소는 비활성으로 두지 않는다(M3 Buttons)
  list?.addEventListener('change', () => { list.querySelector('[data-dialog-confirm]').disabled = !list.querySelector('input:checked'); });
  list?.addEventListener('close', () => {
    const picked = list.querySelector('input:checked')?.value;
    result.textContent = list.returnValue === 'confirm' && picked ? `테마: ${picked}` : '선택 취소';
    say(result.textContent);
  });

  // 전체 화면: 스크롤하면 머리를 surface-container로, 닫기(X) · Esc는 변경이 있으면 확인
  const fullForm = full?.querySelector('form');
  const values = () => Object.fromEntries(new FormData(fullForm));
  full?.querySelector('[data-dialog-scroll]')?.addEventListener('scroll', event => {
    full.querySelector('.m3-dialog').toggleAttribute('data-scrolled', event.currentTarget.scrollTop > 0);
  });
  const requestDismiss = () => {
    if (!dialogHasChanges(JSON.parse(full.dataset.initial || '{}'), values())) { full.close('cancel'); return; }
    // 전체 화면 위에 Basic 대화상자를 띄운다(전체 화면만 위에 다른 대화상자를 허용)
    open(discard, full.querySelector('[data-dialog-dismiss]'));
  };
  full?.querySelector('[data-dialog-dismiss]')?.addEventListener('click', requestDismiss);
  full?.addEventListener('cancel', event => { event.preventDefault(); requestDismiss(); });
  discard?.addEventListener('close', () => {
    if (discard.returnValue === 'confirm') { full.close('discard'); }
    else say('편집을 계속합니다');
  });
  full?.addEventListener('close', () => {
    if (full.returnValue === 'confirm') {
      const v = values();
      result.textContent = `일정 저장됨${v.title ? ` — ${v.title}` : ''}`;
    } else result.textContent = full.returnValue === 'discard' ? '변경 내용 삭제됨' : '새 일정 취소';
    say(result.textContent);
  });
})();

// ─── Live 아일랜드(2026-09-28 조정 UI 규칙) ───
// Styles의 Live 데모 조작 줄(데모 하나에만 적용)을 Live 블록 제목 바로 아래의 무채색 아일랜드 하나로 묶는다.
// 줄을 옮기기만 하므로 각 줄의 이벤트 · 상태는 그대로다. 결과 줄(Preview · Output 등)은 아일랜드 밖, 그 아래에 남는다.
const LIVE_CONTROLS = {
  'color-static': ['Input'],
  'spacing-parts': ['Search'],
  'spacing-applying': ['Text scale'],
  'typography-type-scale': ['Role', 'Size', 'Emphasized', 'Text'],
  'typography-applying-type': ['Tabular numbers', 'Value'],
  'shape-corner-radius-scale': ['Style', 'Corners'],
  'motion-physics': ['Scheme', 'Web'],
  'motion-transitions': ['Pattern'],
  'states-state-layers': ['Container', 'State'],
  'states-applying-states': ['Disabled'],
};
function buildLiveIslands() {
  Object.entries(LIVE_CONTROLS).forEach(([id, labels]) => {
    const item = document.getElementById(id);
    const live = item && [...item.querySelectorAll('.btn-spec-block')].find(block => block.getAttribute('aria-label') === 'Live');
    if (!live || live.querySelector('.pl-island')) return;
    const rows = [...live.querySelectorAll(':scope > .btn-spec-row')]
      .filter(row => labels.includes(row.querySelector(':scope > .btn-spec-label')?.textContent.trim()));
    if (!rows.length) return;
    const island = document.createElement('div');
    island.className = 'pl-island';
    island.setAttribute('role', 'group');
    island.setAttribute('aria-label', `${itemNameText(item)} 조정`);
    (live.querySelector(':scope > .btn-spec-live-head') || rows[0].parentElement).append(island);   // Live 패널 머리줄로
    island.append(...rows);
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(buildLiveIslands));
else requestAnimationFrame(buildLiveIslands);

// 페이지 아일랜드 Filled → Elevated(2026-09-29): 본문이 스크롤돼 아일랜드가 내용 위에 뜨면 그림자를 준다.
(() => {
  const preview = document.getElementById('library-preview');
  if (!preview) return;
  const sync = () => {
    const lifted = preview.scrollTop > 0;
    document.querySelectorAll('.pl-comp-page').forEach(head => head.toggleAttribute('data-elevated', lifted));
  };
  preview.addEventListener('scroll', sync, { passive: true });
  sync();
})();

// ─── Search — 검색창을 누르면 검색 뷰(전체 화면 · docked), 입력으로 제안 거르기, combobox 키보드(명세 4.4.3) ───
(() => {
  const bindSearch = (frame, { startOpen = false } = {}) => {
  const opener = frame.querySelector('[data-search-open]');
  const view = frame.querySelector('.m3-search-view');
  const input = view.querySelector('[data-search-input]');
  const list = view.querySelector('[data-search-results]');
  const clear = view.querySelector('[data-search-clear]');
  const value = opener.querySelector('[data-search-value]');
  const ITEMS = ['화면 밝기', '다크 모드', '글자 크기', '배경 화면', '알림 소리', '배터리 절약', '저장 공간', '언어', '개인정보 보호', '움직임 줄이기'];
  const RECENT = ['화면 밝기', '다크 모드', '글자 크기', '배경 화면'];
  const ICON = { history: 'M480-120q-138 0-240.5-91.5T122-440h82q14 104 92.5 172T480-200q117 0 198.5-81.5T760-480q0-117-81.5-198.5T480-760q-69 0-129 32t-101 88h110v80H120v-240h80v94q51-64 124.5-99T480-840q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-480q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-120Zm112-192L440-464v-216h80v184l128 128-56 56Z', search: 'M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z' };
  let active = -1;
  let options = [];
  const render = () => {
    const q = input.value;
    const found = q.trim() ? searchFilter(ITEMS, q) : searchFilter(RECENT, '');
    clear.hidden = !q;
    active = -1;
    input.removeAttribute('aria-activedescendant');
    list.replaceChildren();
    if (!found.length) {
      const li = document.createElement('li');
      li.className = 'm3-search-empty';
      li.setAttribute('role', 'presentation');
      li.textContent = '결과 없음';
      list.append(li);
    }
    options = found.map((text, i) => {
      const li = document.createElement('li');
      li.className = 'm3-search-result';
      li.id = `${view.id}-opt-${i}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.innerHTML = `<svg class="icon icon-symbol" viewBox="0 -960 960 960" aria-hidden="true"><path d="${q.trim() ? ICON.search : ICON.history}"/></svg><span class="m3-search-result-text"></span>`;
      li.querySelector('.m3-search-result-text').textContent = text;
      li.addEventListener('pointerdown', event => event.preventDefault());   // 입력칸 포커스 유지
      li.addEventListener('click', () => choose(text));
      list.append(li);
      return li;
    });
  };
  const setActive = i => {
    active = i;
    options.forEach((li, k) => { li.toggleAttribute('data-active', k === i); li.setAttribute('aria-selected', String(k === i)); });
    if (i >= 0) { input.setAttribute('aria-activedescendant', options[i].id); options[i].scrollIntoView({ block: 'nearest' }); }
    else input.removeAttribute('aria-activedescendant');
  };
  const open = ({ focus = true, keyboard = false } = {}) => {
    view.dataset.type = frame.dataset.type;
    view.toggleAttribute('data-kbd', keyboard);   // 키보드로 열었을 때만 입력칸 링(organisms.css)
    view.hidden = false;
    opener.setAttribute('aria-expanded', 'true');
    input.value = value.hasAttribute('data-filled') ? value.textContent : '';
    render();
    if (focus) input.focus();
  };
  const close = ({ restore = true } = {}) => {
    if (view.hidden) return;
    view.hidden = true;
    opener.setAttribute('aria-expanded', 'false');
    if (restore) opener.focus();
  };
  const choose = text => {
    const t = text.trim();
    value.textContent = t || '설정 검색';
    value.toggleAttribute('data-filled', Boolean(t));
    close();
  };
  opener.addEventListener('click', event => open({ keyboard: event.detail === 0 }));   // detail 0 = Enter · Space
  view.querySelector('[data-search-close]').addEventListener('click', () => close());
  clear.addEventListener('click', () => { input.value = ''; render(); input.focus(); });
  input.addEventListener('input', render);
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(searchNextIndex(active, options.length, event.key));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(active >= 0 ? options[active].textContent : input.value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (active >= 0) setActive(-1); else close();
    }
  });
  // 전체 화면은 포커스를 뷰 안에 가둔다
  view.addEventListener('keydown', event => {
    if (event.key === 'Tab') view.setAttribute('data-kbd', '');   // 뷰 안에서 키보드로 옮기기 시작하면 링을 보인다
    if (event.key === 'Escape' && event.target !== input) { event.preventDefault(); close(); return; }   // 뒤로 · 지우기 버튼에서도 Esc로 닫기
    if (event.key !== 'Tab' || view.dataset.type !== 'fullscreen') return;
    const items = [...view.querySelectorAll(DIALOG_FOCUSABLE)].filter(el => el.offsetParent !== null);
    const target = dialogTabTarget(items.indexOf(document.activeElement), items.length, event.shiftKey);
    if (target >= 0) { event.preventDefault(); items[target].focus(); }
  });
  // docked는 바깥을 누르거나 포커스가 떠나면 닫는다
  document.addEventListener('pointerdown', event => {
    if (!view.hidden && !view.contains(event.target) && !opener.contains(event.target)) close({ restore: false });
  });
  view.addEventListener('focusout', event => {
    if (view.dataset.type === 'docked' && !view.contains(event.relatedTarget) && event.relatedTarget) close({ restore: false });
  });
  if (startOpen) open({ focus: false });
  return { close };
  };
  // Saving UI 장면 — 연 검색 화면으로 시작한다
  document.addEventListener('saving:rendered', e => e.detail.block.querySelectorAll('[data-search-live]').forEach(f => bindSearch(f, { startOpen: true })));
  const frame = document.querySelector('[data-search-live]');
  const controls = document.querySelector('.search-controls');
  if (!frame) return;
  const { close } = bindSearch(frame);

  if (!controls) return;
  const KEY = 'bw-search-view';
  const state = { type: 'fullscreen' };
  loadView(KEY, state);
  const apply = () => {
    close({ restore: false });
    frame.dataset.type = state.type;
    frame.classList.toggle('m3-search-frame--phone', state.type === 'fullscreen');
    frame.classList.toggle('m3-search-frame--wide', state.type === 'docked');
    controls.querySelectorAll('[data-search-axis]').forEach(group => markRadios(group, state[group.dataset.searchAxis]));
    saveView(KEY, state);
  };
  const sync = event => {
    const group = event.target.closest('[data-search-axis]');
    const checked = group?.querySelector('[role="radio"][aria-checked="true"]');
    if (!checked) return;
    state[group.dataset.searchAxis] = checked.dataset.value;
    apply();
  };
  controls.addEventListener('click', sync);
  controls.addEventListener('keydown', sync);
  apply();
})();

// ─── Sheets — 바텀 시트(모달 · 표준, 끌기 · 손잡이 · Esc) · 사이드 시트(모달 · 표준), 명세 4.5.6 ───
(() => {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const trap = (box, event) => {
    if (event.key !== 'Tab') return;
    const items = [...box.querySelectorAll(DIALOG_FOCUSABLE)].filter(el => el.offsetParent !== null);
    const target = dialogTabTarget(items.indexOf(document.activeElement), items.length, event.shiftKey);
    if (target >= 0) { event.preventDefault(); items[target].focus(); }
  };
  const islandBar = (selector, axis, key, onChange) => {
    const bar = document.querySelector(selector);
    if (!bar) return;
    const view = { type: 'modal' };
    loadView(key, view);
    const apply = () => {
      bar.querySelectorAll(`[data-${axis}-axis] [role="radio"]`).forEach(button => {
        const on = button.dataset.value === view.type;
        button.setAttribute('aria-checked', String(on));
        button.tabIndex = on ? 0 : -1;
      });
      saveView(key, view);
      onChange(view.type);
    };
    const sync = event => {
      const checked = event.target.closest(`[data-${axis}-axis]`)?.querySelector('[role="radio"][aria-checked="true"]');
      if (!checked) return;
      view.type = checked.dataset.value;
      apply();
    };
    bar.addEventListener('click', sync);
    bar.addEventListener('keydown', sync);
    apply();
  };

  /* ─── 바텀 시트 ─── */
  const bindBottomSheet = (bFrame, { startOpen = false } = {}) => {
    const sheet = bFrame.querySelector('[data-bsheet]');
    const handle = sheet.querySelector('[data-sheet-handle]');
    const scrim = bFrame.querySelector('[data-sheet-scrim]');
    const opener = bFrame.querySelector('[data-bsheet-open]');
    const result = bFrame.querySelector('[data-bsheet-result]');
    let state = 'hidden';
    let motionTimer = 0;
    const type = () => bFrame.dataset.type;
    const place = (s, { animate = true } = {}) => {
      if (!animate) sheet.setAttribute('data-dragging', '');
      sheet.style.setProperty('--sheet-offset', `${sheetOffset(s, sheet.offsetHeight, bFrame.clientHeight)}px`);
      if (!animate) { void sheet.offsetWidth; sheet.removeAttribute('data-dragging'); }
    };
    const setState = (s, { restore = true } = {}) => {
      const prev = state;
      state = s;
      opener.setAttribute('aria-expanded', String(s === 'expanded' || s === 'partial'));
      handle.setAttribute('aria-expanded', String(s === 'expanded'));
      // 들어오고 나가는 전환은 M3 전환 패턴(들어올 때 emphasized 감속 400 · 나갈 때 가속 200) — 튕기면 시트 아래 틈이 보인다.
      // 끌기를 놓은 뒤 자리 잡기(펼침 ↔ 반 · 접힘)만 스프링(data-motion 없음)
      clearTimeout(motionTimer);
      if (s === 'hidden') {
        sheet.dataset.motion = 'exit';
        place('hidden');
        if (!scrim.hidden) scrim.setAttribute('data-leaving', '');
        bFrame.querySelector('.m3-sheet-page').inert = false;
        const done = () => { scrim.removeAttribute('data-leaving'); delete sheet.dataset.motion; if (state === 'hidden') { sheet.hidden = true; scrim.hidden = true; } };
        if (reduce?.matches) done(); else motionTimer = setTimeout(done, 200);
        if (restore && prev !== 'hidden') opener.focus();
        return;
      }
      const entering = sheet.hidden || prev === 'hidden';
      if (sheet.hidden) { sheet.hidden = false; place('hidden', { animate: false }); }
      if (entering) { sheet.dataset.motion = 'enter'; motionTimer = setTimeout(() => { delete sheet.dataset.motion; }, 400); } else delete sheet.dataset.motion;
      const modal = type() === 'modal';
      scrim.removeAttribute('data-leaving');
      scrim.hidden = !modal;
      bFrame.querySelector('.m3-sheet-page').inert = modal;   // 모달은 뒤 내용을 잠근다
      requestAnimationFrame(() => place(s));
    };
    const open = () => { setState(type() === 'modal' ? 'expanded' : (state === 'expanded' ? 'collapsed' : 'expanded')); if (type() === 'modal') handle.focus({ preventScroll: true }); };   // 아직 틀 밖에 있는 손잡이로 포커스를 옮길 때 틀이 스크롤되지 않게
    opener.addEventListener('click', open);
    scrim.addEventListener('click', () => setState('hidden'));
    sheet.addEventListener('keydown', event => {
      if (event.key === 'Escape' && type() === 'modal') { event.preventDefault(); setState('hidden'); return; }
      if (type() === 'modal') trap(sheet, event);
    });
    sheet.querySelectorAll('[data-sheet-action]').forEach(row => row.addEventListener('click', () => {
      result.textContent = `선택: ${row.textContent.trim()}`;
      setState(type() === 'modal' ? 'hidden' : 'collapsed');
    }));
    // 끌기 — 손잡이를 잡고 위아래로, 놓으면 속도 125 px/s(휙 밀기) · 거리 56으로 판정(Compose Velocity · PositionalThreshold). 움직이지 않으면 누르기로 본다.
    let drag = null;
    handle.addEventListener('pointerdown', event => {
      drag = { y: event.clientY, base: sheetOffset(state, sheet.offsetHeight, bFrame.clientHeight), moved: false, samples: [{ t: event.timeStamp, y: event.clientY }] };
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', event => {
      if (!drag) return;
      const dy = event.clientY - drag.y;
      drag.samples.push({ t: event.timeStamp, y: event.clientY });
      if (drag.samples.length > 20) drag.samples.shift();
      if (Math.abs(dy) > 4) drag.moved = true;
      if (!drag.moved) return;
      sheet.setAttribute('data-dragging', '');
      sheet.style.setProperty('--sheet-offset', `${Math.max(0, drag.base + dy)}px`);
    });
    const endDrag = event => {
      if (!drag) return;
      const { moved, y, samples } = drag;
      drag = null;
      sheet.removeAttribute('data-dragging');
      samples.push({ t: event.timeStamp, y: event.clientY });
      if (moved) { handle.dataset.dragged = ''; setState(sheetSettle(type(), state, event.clientY - y, sheetVelocity(samples))); }   // 휙 밀기는 속도로
    };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
    handle.addEventListener('click', () => {
      if ('dragged' in handle.dataset) { delete handle.dataset.dragged; return; }
      setState(sheetHandleNext(type(), state));   // 누르기 · Enter · Space — 펼침 ↔ 접힘
    });
    if (startOpen) setState('expanded', { restore: false });
    return { sheet, opener, setState };
  };
  // Saving UI 장면 — 연 모달 시트로 시작한다
  document.addEventListener('saving:rendered', e => e.detail.block.querySelectorAll('[data-bsheet-live]').forEach(f => bindBottomSheet(f, { startOpen: true })));
  const bFrame = document.querySelector('[data-bsheet-live]');
  if (bFrame) {
    const { sheet, opener, setState } = bindBottomSheet(bFrame);
    islandBar('.bsheet-controls', 'bsheet', 'bw-bsheet-view', t => {
      bFrame.dataset.type = t;
      const modal = t === 'modal';
      sheet.setAttribute('role', modal ? 'dialog' : 'region');
      if (modal) sheet.setAttribute('aria-modal', 'true'); else sheet.removeAttribute('aria-modal');
      opener.textContent = modal ? '더보기' : '시트 펼치기 · 접기';
      if (modal) setState('hidden', { restore: false }); else setState('collapsed', { restore: false });
    });
  }

  /* ─── 사이드 시트 ─── */
  const sFrame = document.querySelector('[data-ssheet-frame]');
  if (sFrame) {
    const sheet = sFrame.querySelector('[data-ssheet-live]');
    const scrim = sFrame.querySelector('[data-sheet-scrim]');
    const opener = sFrame.querySelector('[data-ssheet-open]');
    const result = sFrame.querySelector('[data-ssheet-result]');
    const page = sFrame.querySelector('.m3-sheet-page');
    const modal = () => sFrame.dataset.type === 'modal';
    let leaveTimer = 0;
    const show = on => {
      opener.setAttribute('aria-expanded', String(on));
      clearTimeout(leaveTimer);
      [sheet, scrim].forEach(el => el.removeAttribute('data-leaving'));
      if (on) {
        sheet.hidden = false;
        scrim.hidden = !modal();
        page.inert = modal();
        (sheet.querySelector('input:checked') || sheet.querySelector('[data-ssheet-close]'))?.focus({ preventScroll: true });   // 처음 포커스는 고른 값
        return;
      }
      page.inert = false;
      // 모달은 밖으로 밀려 나가며(가속 200) scrim도 함께 사라진다
      if (sheet.hidden || !modal() || reduce?.matches) { sheet.hidden = true; scrim.hidden = true; return; }
      sheet.setAttribute('data-leaving', '');
      if (!scrim.hidden) scrim.setAttribute('data-leaving', '');
      leaveTimer = setTimeout(() => { sheet.hidden = true; scrim.hidden = true; [sheet, scrim].forEach(el => el.removeAttribute('data-leaving')); }, 200);
    };
    const close = () => { show(false); opener.focus(); };
    opener.addEventListener('click', () => (sheet.hidden ? show(true) : close()));
    scrim.addEventListener('click', close);
    sheet.querySelectorAll('[data-ssheet-close]').forEach(b => b.addEventListener('click', close));
    sheet.querySelector('[data-ssheet-apply]').addEventListener('click', () => {
      const checked = sheet.querySelector('input:checked');
      result.textContent = `정렬: ${checked?.closest('label').textContent.trim() || ''}`;
      close();
    });
    sheet.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (modal()) trap(sheet, event);
    });
    islandBar('.ssheet-controls', 'ssheet', 'bw-ssheet-view', t => {
      sFrame.dataset.type = t;
      sheet.toggleAttribute('data-modal', t === 'modal');
      sheet.setAttribute('role', t === 'modal' ? 'dialog' : 'complementary');
      if (t === 'modal') sheet.setAttribute('aria-modal', 'true'); else sheet.removeAttribute('aria-modal');
      show(false);
    });
  }
})();

// ─── Sliders — 그리기(트랙 조각 · 멈춤 점 · 손잡이 · 값 표시 · 아이콘), 끌기 · 키보드, 보기 전환 Size(명세 4.6.5) ───
(() => {
  const sliders = [...document.querySelectorAll('.m3-slider')];
  if (!sliders.length) return;
  const num = (v, d) => (v === undefined || v === '' ? d : Number(v));
  const opts = el => ({ min: num(el.dataset.min, 0), max: num(el.dataset.max, 100), step: num(el.dataset.step, 1) });
  const fmt = v => String(Math.round(v * 100) / 100);
  const make = (cls, parent) => { const n = document.createElement('div'); n.className = cls; parent.append(n); return n; };
  const render = el => {
    const size = SLIDER_SIZES[el.dataset.size || 'xs'] || SLIDER_SIZES.xs;
    el.style.setProperty('--sl-track', `${size.track}px`);
    el.style.setProperty('--sl-handle', `${size.handle}px`);
    const vertical = el.dataset.orientation === 'vertical';
    const length = vertical ? el.clientHeight : el.clientWidth;
    if (!length) return;
    const { min, max, step } = opts(el);
    const values = el.dataset.values.split(',').map(Number);
    const type = el.dataset.type || 'standard';
    const narrow = i => el.dataset.state === 'focus' || el.dataset.state === 'pressed' || el.dataset.active === String(i);
    const widths = values.map((_, i) => (narrow(i) ? SLIDER.pressedHandleWidth : SLIDER.handleWidth));
    const positions = values.map((v, i) => sliderPos(sliderFraction(v, min, max), length, widths[i]));
    const place = (node, from, size2) => {
      if (vertical) { node.style.bottom = `${from}px`; if (size2 !== undefined) node.style.height = `${size2}px`; }
      else { node.style.insetInlineStart = `${from}px`; if (size2 !== undefined) node.style.width = `${size2}px`; }
    };
    let track = el.querySelector('.m3-slider-track');
    if (!track) track = make('m3-slider-track', el);
    track.querySelectorAll('.m3-slider-seg, .m3-slider-stop, .m3-slider-icon').forEach(n => n.remove());
    const segs = sliderSegments({ length, positions, type, radius: size.radius, handleWidths: widths });
    segs.forEach(s => {
      const n = make('m3-slider-seg', track);
      n.toggleAttribute('data-active', s.active);
      place(n, s.from, s.to - s.from);
      if (vertical) { n.style.borderRadius = `${s.r1}px ${s.r1}px ${s.r0}px ${s.r0}px`; }
      else { n.style.borderStartStartRadius = n.style.borderEndStartRadius = `${s.r0}px`; n.style.borderStartEndRadius = n.style.borderEndEndRadius = `${s.r1}px`; }
    });
    const count = el.hasAttribute('data-stops') ? Math.round((max - min) / step) + 1 : 0;
    sliderStops({ length, positions, type, count }).forEach(s => { const n = make('m3-slider-stop', track); n.toggleAttribute('data-active', s.active); place(n, s.pos); });
    // 안쪽 아이콘(M 이상) — 활성 트랙 시작에 자리가 있으면 그 안(on-primary), 없으면 손잡이 뒤 비활성 트랙(on-secondary-container)
    if (el.dataset.icon && size.icon) {
      const svgNS = 'http://www.w3.org/2000/svg';
      const icon = document.createElementNS(svgNS, 'svg');
      icon.setAttribute('class', 'm3-slider-icon');
      icon.setAttribute('viewBox', '0 -960 960 960');
      icon.setAttribute('aria-hidden', 'true');
      icon.setAttribute('width', size.icon); icon.setAttribute('height', size.icon);
      const path = document.createElementNS(svgNS, 'path'); path.setAttribute('d', el.dataset.icon); icon.append(path);
      const first = segs[0];
      const fits = first?.active && first.to - first.from >= size.icon + 2 * SLIDER.iconPad;
      const at = fits ? SLIDER.iconPad : positions[0] + widths[0] / 2 + SLIDER.gap + SLIDER.iconPad;
      icon.toggleAttribute('data-active', Boolean(fits));
      if (vertical) icon.style.bottom = `${at}px`; else icon.style.insetInlineStart = `${at}px`;
      track.append(icon);
    }
    // 손잡이 · 값 표시
    const handles = [...el.querySelectorAll(':scope > .m3-slider-handle')];
    values.forEach((v, i) => {
      let h = handles[i];
      if (!h) {
        h = make('m3-slider-handle', el);
        if (el.hasAttribute('data-live')) {
          h.setAttribute('role', 'slider');
          h.tabIndex = el.hasAttribute('data-disabled') ? -1 : 0;
          const names = (el.dataset.labels || '').split(',');
          h.setAttribute('aria-label', names[i] || el.dataset.label || '값');
          if (vertical) h.setAttribute('aria-orientation', 'vertical');
        }
      }
      if (vertical) h.style.height = `${widths[i]}px`; else h.style.width = `${widths[i]}px`;
      place(h, positions[i]);
      if (el.dataset.state && !el.hasAttribute('data-live')) h.dataset.state = el.dataset.state;
      if (h.getAttribute('role') === 'slider') {
        const lo = type === 'range' && i === 1 ? values[0] : min;
        const hi = type === 'range' && i === 0 ? values[1] : max;
        h.setAttribute('aria-valuemin', fmt(lo)); h.setAttribute('aria-valuemax', fmt(hi)); h.setAttribute('aria-valuenow', fmt(v));
        if (el.hasAttribute('data-disabled')) h.setAttribute('aria-disabled', 'true');
      }
    });
    el.querySelectorAll(':scope > .m3-slider-value').forEach(n => n.remove());
    if (el.hasAttribute('data-indicator')) {
      values.forEach((v, i) => {
        const show = el.dataset.state === 'pressed' || el.dataset.active === String(i);
        if (!show) return;
        const n = make('m3-slider-value', el);
        n.textContent = fmt(v);
        n.setAttribute('aria-hidden', 'true');
        place(n, positions[i]);
      });
    }
  };
  const renderAll = () => sliders.forEach(render);

  // 끌기 · 누르기 — 트랙 어디를 눌러도 가까운 손잡이가 온다
  const setValue = (el, i, v) => {
    const values = el.dataset.values.split(',').map(Number);
    if (el.dataset.type === 'range') v = i === 0 ? Math.min(v, values[1]) : Math.max(v, values[0]);
    if (values[i] === v) return;
    values[i] = v;
    el.dataset.values = values.join(',');
    render(el);
  };
  const bindLive = el => {
    const vertical = el.dataset.orientation === 'vertical';
    const posOf = event => {
      const r = el.getBoundingClientRect();
      if (vertical) return r.bottom - event.clientY;
      return getComputedStyle(el).direction === 'rtl' ? r.right - event.clientX : event.clientX - r.left;
    };
    const lengthOf = () => (vertical ? el.clientHeight : el.clientWidth);
    let drag = null;
    let viaPointer = false;
    el.addEventListener('pointerdown', event => {
      if (el.hasAttribute('data-disabled') || event.button !== 0) return;
      const { min, max } = opts(el);
      const values = el.dataset.values.split(',').map(Number);
      const positions = values.map(v => sliderPos(sliderFraction(v, min, max), lengthOf()));
      const i = sliderNearest(positions, posOf(event));
      drag = i;
      el.dataset.active = String(i);
      el.setAttribute('data-dragging', '');
      el.setPointerCapture(event.pointerId);
      setValue(el, i, sliderValueAt(posOf(event), lengthOf(), opts(el)));
      render(el);
      event.preventDefault();
      viaPointer = true;   // 마우스로 생긴 포커스 — Focused(좁은 손잡이 · 값 표시 · 링)로 보지 않는다
      el.querySelectorAll(':scope > .m3-slider-handle')[i]?.focus({ preventScroll: true, focusVisible: false });
    });
    el.addEventListener('pointermove', event => { if (drag !== null) setValue(el, drag, sliderValueAt(posOf(event), lengthOf(), opts(el))); });
    const end = () => { if (drag === null) return; drag = null; el.removeAttribute('data-dragging'); if (viaPointer || !el.contains(document.activeElement)) delete el.dataset.active; render(el); };   // 마우스로 놓으면 폭 4로 돌아온다(포커스는 남아도 키보드 포커스가 아님)
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('keydown', event => {
      const h = event.target.closest('.m3-slider-handle');
      if (!h || el.hasAttribute('data-disabled')) return;
      viaPointer = false;   // 키보드로 조작하면 Focused
      const i = [...el.querySelectorAll(':scope > .m3-slider-handle')].indexOf(h);
      const values = el.dataset.values.split(',').map(Number);
      const o = opts(el);
      const range = el.dataset.type === 'range';
      const next = sliderKey(values[i], event.key, { ...o, rtl: !vertical && getComputedStyle(el).direction === 'rtl', lo: range && i === 1 ? values[0] : o.min, hi: range && i === 0 ? values[1] : o.max });
      if (next === null) return;
      event.preventDefault();
      el.dataset.active = String(i);
      setValue(el, i, next);
      render(el);
    });
    // 누르는 동안과 키보드 포커스일 때 손잡이가 좁아지고 값 표시를 보인다(M3 States: Pressed · Focused). 마우스 클릭으로 생긴 포커스는 Focused로 보지 않는다(:focus-visible)
    el.addEventListener('focusin', event => { const i = [...el.querySelectorAll(':scope > .m3-slider-handle')].indexOf(event.target); if (i >= 0 && !viaPointer) { el.dataset.active = String(i); render(el); } });
    el.addEventListener('focusout', () => { if (drag === null) { viaPointer = false; delete el.dataset.active; render(el); } });
  };
  sliders.filter(el => el.hasAttribute('data-live')).forEach(bindLive);

  // 보기 전환 Size — 모든 견본(States · Configurations · Live)
  const bar = document.querySelector('.slider-controls');
  const view = { size: 'xs' };
  loadView('bw-slider-view', view);
  const apply = () => {
    sliders.forEach(el => { el.dataset.size = view.size; });
    markRadios(bar?.querySelector('[data-slider-axis]'), view.size);
    saveView('bw-slider-view', view);
    renderAll();
  };
  onIslandPick(bar, '[data-slider-axis]', value => { view.size = value; apply(); });
  apply();
  // 숨겨진 페이지에서 처음 그리면 길이가 0 — 보이게 되면(메뉴 이동 · 창 크기) 다시 그린다
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => entries.forEach(entry => render(entry.target))) : null;
  sliders.forEach(el => ro?.observe(el));
  // Saving UI 장면의 슬라이더(모드가 바뀔 때마다 새로 생김)도 그린다
  document.addEventListener('saving:rendered', e => e.detail.block.querySelectorAll('.m3-slider').forEach(el => { render(el); ro?.observe(el); if (el.hasAttribute('data-live')) bindLive(el); }));
})();

// ─── Snackbar 데모 — 한 번에 하나 · 대기열, 4초 / 동작 있으면 닫을 때까지, 마우스 · 포커스가 있으면 멈춤, Esc(명세 4.7.2) ───
(() => {
  const frame = document.querySelector('[data-snackbar-live]');
  if (!frame) return;
  const host = frame.querySelector('[data-snack-host]');
  const result = frame.querySelector('[data-snack-result]');
  const CLOSE = 'm256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z';
  const KINDS = {
    message: { text: '사진을 저장했어요' },
    action: { text: '사진 3장을 보관했어요', action: '되돌리기' },
    close: { text: '연결이 끊겼어요', action: '다시 시도', close: true },
    long: { text: '오프라인 상태라 변경 사항을 기기에만 저장했어요', action: '연결되면 다시 동기화', long: true },
  };
  let queue = [];
  let current = null;
  let timer = 0;
  let remaining = 0;
  let started = 0;
  const startTimer = ms => { clearTimeout(timer); remaining = ms; if (!Number.isFinite(ms)) return; started = Date.now(); timer = setTimeout(() => dismiss('timeout'), ms); };
  const pause = () => { if (!current || !Number.isFinite(remaining)) return; clearTimeout(timer); remaining -= Date.now() - started; };
  const resume = () => { if (current && !current.contains(document.activeElement) && !current.matches(':hover')) startTimer(Math.max(1000, remaining)); };
  const dismiss = reason => {
    if (!current) return;
    const el = current;
    current = null;
    clearTimeout(timer);
    const hadFocus = el.contains(document.activeElement);
    el.removeAttribute('data-show');
    el.setAttribute('data-leaving', '');
    const done = () => { el.remove(); showNext(); };
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) done(); else setTimeout(done, 150);
    if (hadFocus) frame.querySelector('[data-snack]')?.focus();
    if (reason === 'action') result.textContent = `동작: ${el.dataset.actionLabel}`;
  };
  const showNext = () => {
    if (current) return;
    const next = snackbarNext(queue);
    queue = next.queue;
    if (!next.current) return;
    const item = next.current;
    const el = document.createElement('div');
    el.className = 'm3-snackbar';
    el.setAttribute('role', 'status');
    const p = document.createElement('p');
    p.className = 'm3-snackbar-text';
    p.textContent = item.text;
    el.append(p);
    if (item.action) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'm3-snackbar-action';
      b.textContent = item.action;
      b.addEventListener('click', () => dismiss('action'));
      el.append(b);
      el.dataset.actionLabel = item.action;
    }
    if (item.close) {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'm3-snackbar-close';
      c.setAttribute('aria-label', '알림 닫기');
      c.innerHTML = `<svg class="icon icon-symbol" viewBox="0 -960 960 960" aria-hidden="true"><path d="${CLOSE}"/></svg>`;
      c.addEventListener('click', () => dismiss('close'));
      el.append(c);
    }
    host.append(el);
    // 긴 동작은 아래 줄로(동작 글이 폭의 절반 넘음)
    const actionEl = el.querySelector('.m3-snackbar-action');
    if (actionEl && (item.long || snackbarLayout({ textWidth: p.scrollWidth, available: host.clientWidth - 24, actionWidth: actionEl.offsetWidth }).longAction)) el.setAttribute('data-long-action', '');
    el.setAttribute('data-show', '');
    el.addEventListener('pointerenter', pause);
    el.addEventListener('pointerleave', resume);
    el.addEventListener('focusin', pause);
    el.addEventListener('focusout', () => requestAnimationFrame(resume));
    el.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); dismiss('close'); } });
    current = el;
    startTimer(snackbarDuration({ action: Boolean(item.action) }));
  };
  frame.querySelectorAll('[data-snack]').forEach(button => button.addEventListener('click', () => {
    queue = snackbarEnqueue(queue, KINDS[button.dataset.snack]);
    if (current) dismiss('replaced');   // 새 스낵바가 오면 지금 것을 닫고 다음 것을 보인다
    else showNext();
  }));
})();

// ─── Tabs — 표시기 배치(primary 내용 폭 · secondary 칸 폭), 화살표 포커스 · Enter/Space 선택, 스크롤형 따라가기, 보기 전환 Type(명세 4.4.4) ───
(() => {
  const lists = [...document.querySelectorAll('.m3-tabs')];
  if (!lists.length) return;
  const place = (list, { animate = true } = {}) => {
    const track = list.querySelector('.m3-tabs-track');
    const ind = list.querySelector('.m3-tabs-indicator');
    const tab = list.querySelector('.m3-tab[aria-selected="true"]');
    if (!ind) return;
    if (!tab) { ind.style.width = '0px'; return; }
    const base = track.getBoundingClientRect();
    const t = tab.getBoundingClientRect();
    const c = tab.querySelector('.m3-tab-content').getBoundingClientRect();
    const pos = tabsIndicator(list.dataset.variant, { left: t.left - base.left, width: t.width }, { left: c.left - base.left, width: c.width });
    if (!animate) ind.style.transition = 'none';
    ind.style.left = `${pos.left}px`;
    ind.style.width = `${pos.width}px`;
    if (!animate) { void ind.offsetWidth; ind.style.transition = ''; }
    if (list.hasAttribute('data-scrollable')) list.style.setProperty('--tabs-scroll-w', `${track.scrollWidth + 52}px`);
  };
  const select = (list, tab) => {
    const tabs = [...list.querySelectorAll('.m3-tab')];
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls') || '');
      if (panel) panel.hidden = !on;
    });
    place(list);
    if (list.hasAttribute('data-scrollable')) {
      const r = tab.getBoundingClientRect(), b = list.getBoundingClientRect();
      list.scrollTo({ left: tabsScrollTo({ left: r.left - b.left + list.scrollLeft, width: r.width }, list.clientWidth, list.scrollWidth), behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  };
  // Saving UI 장면의 탭(복제본)도 표시 선 위치를 잡는다 — 보일 때 크기가 생기므로 ResizeObserver로 다시
  const savingRo = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => entries.forEach(e => place(e.target, { animate: false }))) : null;
  document.addEventListener('saving:rendered', e => e.detail.block.querySelectorAll('.m3-tabs').forEach(l => { place(l, { animate: false }); savingRo?.observe(l); if (l.getAttribute('role') === 'tablist') bind(l); }));
  const bind = list => {
    list.addEventListener('click', event => { const tab = event.target.closest('.m3-tab'); if (tab && tab.getAttribute('aria-disabled') !== 'true') select(list, tab); });
    list.addEventListener('keydown', event => {
      const tabs = [...list.querySelectorAll('.m3-tab')];
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(list, tabs[i]); return; }
      const disabled = tabs.flatMap((t, k) => (t.getAttribute('aria-disabled') === 'true' ? [k] : []));   // 비활성 탭은 건너뛴다
      const next = tabsNextIndex(i, tabs.length, event.key, { rtl: getComputedStyle(list).direction === 'rtl', disabled });
      if (next === i) return;
      event.preventDefault();
      tabs.forEach((t, k) => { t.tabIndex = k === next ? 0 : -1; });   // 포커스만 옮기고 선택은 Enter · Space(수동 활성화)
      tabs[next].focus();
      tabs[next].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    // 포커스가 탭 목록을 떠나면 다음 진입점은 선택된 탭
    list.addEventListener('focusout', event => {
      if (list.contains(event.relatedTarget)) return;
      list.querySelectorAll('.m3-tab').forEach(t => { t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1; });
    });
  };
  lists.filter(list => list.getAttribute('role') === 'tablist').forEach(bind);
  const placeAll = () => lists.forEach(list => place(list, { animate: false }));
  if (typeof ResizeObserver === 'function') { const ro = new ResizeObserver(entries => entries.forEach(e => place(e.target, { animate: false }))); lists.forEach(l => ro.observe(l)); }

  const bar = document.querySelector('.tabs-controls');
  const view = { type: 'primary' };
  loadView('bw-tabs-view', view);
  const apply = () => {
    lists.forEach(list => { list.dataset.variant = view.type; });
    markRadios(bar?.querySelector('[data-tabs-axis]'), view.type);
    saveView('bw-tabs-view', view);
    placeAll();
  };
  onIslandPick(bar, '[data-tabs-axis]', value => { view.type = value; apply(); });
  apply();
})();

// ─── Text fields(Filled · Outlined, 라벨 올림 · 글자 수 · 오류 글 교체 · 지우기 · 비밀번호 표시 · 여러 줄, 명세 4.8.1) ───
(() => {
  const fields = [...document.querySelectorAll('.m3-tf[data-tf-target]')];   // 다른 컴포넌트 안 필드(날짜 입력 등)는 아일랜드를 따르지 않는다
  if (!fields.length) return;
  const live = [...document.querySelectorAll('[data-tf-live] .m3-tf')];
  const grow = input => {
    if (input.tagName !== 'TEXTAREA' || input.closest('[data-textarea]')) return;
    input.style.height = '0px';
    input.style.height = `${tfAutoHeight(input.scrollHeight).height}px`;   // 여러 줄 — 내용만큼 늘어난다
  };
  const bindField = tf => {
    const input = tf.querySelector('.m3-tf-input');
    const supportEl = tf.querySelector('.m3-tf-support-text');
    const counterEl = tf.querySelector('.m3-tf-counter');
    const clear = tf.querySelector('[data-tf-clear]');
    const reveal = tf.querySelector('[data-tf-reveal]');
    const supporting = supportEl?.textContent || '';
    const rules = { required: input.required, type: input.type, maxLength: input.maxLength > 0 ? input.maxLength : Infinity };
    let touched = false;
    const render = () => {
      const value = input.value;
      tf.toggleAttribute('data-populated', value.length > 0);
      if (clear) { clear.hidden = !value.length; tf.toggleAttribute('data-trailing', value.length > 0); }   // 지우기 아이콘은 내용이 있을 때만(M3 Clear icon)
      if (counterEl) {
        const c = tfCounter(value.length, rules.maxLength);
        counterEl.textContent = c.text;
        counterEl.setAttribute('aria-label', c.label);
      }
      const error = touched ? tfValidate(value, rules) : '';
      const msg = tfMessage({ supporting, error });
      tf.toggleAttribute('data-error', msg.error);
      input.setAttribute('aria-invalid', String(msg.error));
      if (supportEl) {
        supportEl.textContent = msg.text;
        if (msg.role) supportEl.setAttribute('role', msg.role); else supportEl.removeAttribute('role');
      }
      grow(input);
    };
    input.addEventListener('input', () => { if (tf.hasAttribute('data-error')) touched = true; render(); });
    input.addEventListener('blur', event => {
      if (tf.contains(event.relatedTarget)) return;   // 필드 안 아이콘 버튼으로 옮겨 갈 때는 검증하지 않는다
      touched = true; render();
    });
    // 컨테이너 어디를 눌러도 입력으로(M3 Container — 필드 전체가 누름 영역)
    tf.querySelector('.m3-tf-field').addEventListener('mousedown', event => {
      if (event.target === input || event.target.closest('button') || input.disabled) return;
      event.preventDefault(); input.focus();
    });
    clear?.addEventListener('click', () => { input.value = ''; render(); input.focus(); });
    reveal?.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      reveal.setAttribute('aria-pressed', String(show));
      reveal.setAttribute('aria-label', show ? '비밀번호 숨기기' : '비밀번호 표시');
      reveal.querySelector('path')?.setAttribute('d', show ? reveal.dataset.offPath : reveal.dataset.onPath);
    });
    render();
  };
  live.forEach(bindField);
  document.addEventListener('saving:rendered', e => e.detail.block.querySelectorAll('.m3-tf').forEach(bindField));   // Saving UI 장면의 입력 칸

  // 메뉴가 붙은 필드 — select(읽기 전용, 고르기만) · auto(입력하면 목록이 좁혀짐). 포커스는 입력에 두고 aria-activedescendant로 항목을 가리킨다(WAI-ARIA combobox)
  live.filter(tf => tf.dataset.combo).forEach(tf => {
    const input = tf.querySelector('[role="combobox"]');
    const list = document.getElementById(input.getAttribute('aria-controls'));
    const options = [...list.querySelectorAll('[role="option"]')];
    const labels = options.map(o => o.textContent.trim());
    const auto = tf.dataset.combo === 'auto';
    let active = -1;
    const visible = () => options.filter(o => !o.hidden);
    const setActive = index => {
      const shown = visible();
      active = index;
      options.forEach(o => o.removeAttribute('data-state'));
      const target = shown[index];
      if (target) { target.dataset.state = 'focus'; input.setAttribute('aria-activedescendant', target.id); target.scrollIntoView({ block: 'nearest' }); }
      else input.removeAttribute('aria-activedescendant');
    };
    const isOpen = () => !list.hidden;
    const open = () => {
      if (!visible().length) return;
      list.hidden = false;
      tf.toggleAttribute('data-expanded', true);
      input.setAttribute('aria-expanded', 'true');
      const sel = visible().findIndex(o => o.getAttribute('aria-selected') === 'true');
      setActive(auto ? -1 : Math.max(0, sel));
    };
    const close = () => {
      list.hidden = true;
      tf.removeAttribute('data-expanded');
      input.setAttribute('aria-expanded', 'false');
      setActive(-1);
    };
    const choose = option => {
      options.forEach(o => o.setAttribute('aria-selected', String(o === option)));
      input.value = option.textContent.trim();
      input.dispatchEvent(new Event('input'));
      close();
    };
    const filter = () => {
      const keep = new Set(searchFilter(labels, input.value, labels.length));
      options.forEach((o, i) => { o.hidden = !keep.has(labels[i]); });
    };
    input.addEventListener('keydown', event => {
      const shown = visible();
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!isOpen()) { open(); if (event.key === 'ArrowUp') setActive(visible().length - 1); else if (auto) setActive(0); return; }
        setActive(menuNextIndex(active, shown.length, event.key));
      } else if (event.key === 'Enter' && isOpen() && shown[active]) {
        event.preventDefault(); choose(shown[active]);
      } else if (event.key === 'Escape' && isOpen()) {
        event.preventDefault(); close();
      } else if (!auto && (event.key === ' ' || event.key === 'Enter') && !isOpen()) {
        event.preventDefault(); open();
      } else if (!auto && isOpen() && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const next = menuTypeahead(shown.map(o => o.textContent.trim()), active, event.key);   // 글자로 이동
        if (next >= 0) setActive(next);
      } else if (event.key === 'Tab' && isOpen()) {
        close();
      }
    });
    if (auto) input.addEventListener('input', event => { if (!event.isTrusted) return; filter(); if (visible().length && input.value) { open(); setActive(-1); } else close(); });
    tf.querySelector('.m3-tf-field').addEventListener('click', () => { if (!auto) (isOpen() ? close() : open()); else if (!isOpen()) { filter(); open(); } });
    list.addEventListener('mousedown', event => event.preventDefault());   // 고르는 동안 입력이 포커스를 잃지 않게
    list.addEventListener('click', event => { const o = event.target.closest('[role="option"]'); if (o) choose(o); });
    input.addEventListener('blur', () => close());
  });

  // 페이지 아일랜드 Type — 모든 견본(States · Configurations · Live)이 따른다
  const bar = document.querySelector('.tf-controls');
  const view = { type: 'filled' };
  loadView('bw-tf-view', view);
  const apply = () => {
    fields.forEach(tf => { tf.dataset.variant = view.type; });
    markRadios(bar?.querySelector('[data-tf-axis]'), view.type);
    saveView('bw-tf-view', view);
  };
  onIslandPick(bar, '[data-tf-axis]', value => { view.type = value; apply(); });
  apply();
})();

// ─── Toolbars(Docked · Floating, Color 아일랜드 · 화살표 이동 · 스크롤 숨김 · 접힘, 명세 4.4.5) ───
(() => {
  const bars = [...document.querySelectorAll('.m3-toolbar')];
  if (!bars.length) return;
  const items = bar => [...bar.querySelectorAll('button:not(:disabled)')];
  // docked 고르게 배치 — 사이 4 ~ 32(Compose DockedToolbarTokens), 넓으면 가운데로 모은다
  const fit = bar => {
    if (bar.dataset.type !== 'docked' || bar.dataset.arrangement) return;
    const kids = [...bar.children];
    const used = kids.reduce((w, el) => w + el.getBoundingClientRect().width, 0);
    const { gap } = toolbarDockedGap(bar.clientWidth, used, kids.length);
    bar.style.setProperty('--tb-gap', `${gap}px`);
    bar.style.justifyContent = 'center';
  };
  bars.forEach(fit);
  if (typeof ResizeObserver === 'function') { const ro = new ResizeObserver(es => es.forEach(e => fit(e.target))); bars.forEach(b => ro.observe(b)); }
  // 키보드 — Tab과 화살표 모두로 이동(M3 Toolbars Accessibility)
  const bindKeys = bar => {
    bar.addEventListener('keydown', event => {
      const list = items(bar);
      const i = list.indexOf(document.activeElement);
      if (i < 0) return;
      const next = toolbarNextIndex(i, list.length, event.key, { vertical: bar.dataset.orientation === 'vertical', rtl: getComputedStyle(bar).direction === 'rtl' });
      if (next === i) return;
      event.preventDefault();
      list[next].focus();
    });
  };
  bars.filter(bar => bar.getAttribute('role') === 'toolbar').forEach(bindKeys);
  // 스크롤 반응 — 40 넘게 내리면 숨김(docked · floating) 또는 접힘(floating + FAB: 툴바가 접히고 FAB가 56 → 80)
  const wire = (frame, getMode) => {
    const content = frame.querySelector('.m3-toolbar-content');
    const target = frame.querySelector(':scope > .m3-toolbar, :scope > .m3-toolbar-group');
    const group = frame.querySelector(':scope > .m3-toolbar-group');
    const fab = group?.querySelector('.m3-fab');
    const tb = group?.querySelector('.m3-toolbar');
    let state = { shown: true, acc: 0 };
    let last = content.scrollTop;
    const render = () => {
      const mode = getMode();
      const hide = mode === 'hide' && !state.shown;
      const collapse = mode === 'collapse' && !state.shown;
      target.toggleAttribute('data-hidden', hide);
      if (group) {
        group.toggleAttribute('data-collapsed', collapse);
        if (tb) { tb.inert = collapse; tb.setAttribute('aria-hidden', String(collapse)); }
        if (fab) {
          const size = toolbarFabSize(collapse ? 1 : 0);
          fab.style.minWidth = fab.style.height = `${size}px`;
          fab.style.borderRadius = collapse ? 'var(--md-shape-lg-increased)' : '';
        }
      }
      // 숨겨도 inert로 막지 않는다 — Tab으로 들어오면 다시 보인다(아래 focusin)
    };
    content.addEventListener('scroll', () => {
      const top = content.scrollTop;
      if (getMode() !== 'stay') state = toolbarScroll(state, top - last, top);
      last = top;
      render();
    }, { passive: true });
    // 키보드로 툴바에 들어오면 다시 보인다(M3: 스크롤 · 접힘 중에도 툴바에 닿을 수 있어야 함)
    frame.addEventListener('focusin', event => { if (event.target.closest('.m3-toolbar-group, .m3-toolbar') && !state.shown) { state = { shown: true, acc: 0 }; render(); } });
    return { reset: () => { state = { shown: true, acc: 0 }; render(); } };
  };
  // Saving UI 장면 — 내려 읽는 동안 숨긴다(M3 허용)
  document.addEventListener('saving:rendered', e => e.detail.block.querySelectorAll('[data-tb-live]').forEach(frame => {
    frame.querySelectorAll('.m3-toolbar[role="toolbar"]').forEach(bindKeys);
    wire(frame, () => 'hide');
  }));
  const liveIsland = (cls, key, frame, def) => {
    const bar = document.querySelector(`.${cls}`);
    const view = { scroll: def };
    loadView(key, view);
    const ctl = wire(frame, () => view.scroll);
    const apply = () => {
      markRadios(bar, view.scroll);
      saveView(key, view);
      ctl.reset();
    };
    onIslandPick(bar, '[data-tb-axis]', value => { view.scroll = value; apply(); });
    apply();
  };
  const dockFrame = document.querySelector('[data-tb-live="docked"]');
  if (dockFrame) liveIsland('tbd-live', 'bw-tbd-view', dockFrame, 'hide');
  const floatFrame = document.querySelector('[data-tb-live="floating"]');
  if (floatFrame) liveIsland('tbf-live', 'bw-tbf-view', floatFrame, 'hide');

  // 페이지 아일랜드 Color — Standard · Vibrant(FAB도 primary-container ↔ tertiary-container)
  const bar = document.querySelector('.tb-controls');
  const view = { color: 'standard' };
  loadView('bw-tb-view', view);
  const apply = () => {
    bars.forEach(b => { b.dataset.color = view.color; });
    document.querySelectorAll('[data-tb-fab]').forEach(f => { if (view.color === 'vibrant') f.dataset.color = 'tertiary-container'; else delete f.dataset.color; });
    markRadios(bar?.querySelector('[data-tb-axis]'), view.color);
    saveView('bw-tb-view', view);
  };
  onIslandPick(bar, '[data-tb-axis]', value => { view.color = value; apply(); });
  apply();
})();

// ─── Tooltips(Plain · Rich, 위치 · 하나만 · 1.5초 뒤 닫힘 · Esc · persistent, 명세 4.7.3) ───
(() => {
  const stages = [...document.querySelectorAll('.m3-tooltip-stage')];
  if (!stages.length) return;
  const rel = (el, stage) => { const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect(); return { left: r.left - s.left, top: r.top - s.top, width: r.width, height: r.height }; };
  const place = (tip, anchor, stage) => {
    const kind = tip.dataset.kind;
    const below = Boolean(anchor.closest('[data-tt-below]')) || tip.dataset.side === 'bottom' && kind === 'plain';
    const box = { width: tip.offsetWidth, height: tip.offsetHeight };
    const p = tooltipPlace(kind, rel(anchor, stage), box, { left: 0, top: 0, width: stage.clientWidth, height: stage.clientHeight }, { below });
    tip.style.left = `${p.left}px`; tip.style.top = `${p.top}px`;
    tip.dataset.side = p.side;
    tip.style.setProperty('--tt-origin', kind === 'plain' ? `center ${p.side === 'top' ? 'bottom' : 'top'}` : `${p.align === 'start' ? 'right' : 'left'} ${p.side === 'top' ? 'bottom' : 'top'}`);
  };
  // 배치 견본(정적) — 바로 앞 버튼(앱 바면 마지막 버튼)에 붙인다
  stages.filter(s => s.hasAttribute('data-tt-static')).forEach(stage => {
    const tip = stage.querySelector(':scope > .m3-tooltip');
    const anchor = [...stage.querySelectorAll('button')].pop();
    place(tip, anchor, stage);
  });
  // 데모 — 한 번에 하나, transient는 떠난 뒤 1.5초, persistent는 바깥과 상호작용할 때만, Esc는 바로
  let open = null, timer = 0;
  const close = () => {
    clearTimeout(timer);
    if (!open) return;
    const { tip, trigger } = open;
    tip.dataset.state = 'closed';
    if (trigger.hasAttribute('data-tt-persistent')) { trigger.setAttribute('aria-expanded', 'false'); setTimeout(() => { if (tip.dataset.state === 'closed') tip.hidden = true; }, 200); }
    open = null;
  };
  const show = trigger => {
    const tip = document.getElementById(trigger.dataset.tt);
    if (!tip) return;
    clearTimeout(timer);
    if (open && open.tip === tip) return;
    close();   // 새 툴팁을 열면 다른 것은 닫는다(M3 Behavior)
    tip.hidden = false;
    place(tip, trigger, trigger.closest('.m3-tooltip-stage'));
    tip.dataset.state = 'open';
    if (trigger.hasAttribute('data-tt-persistent')) trigger.setAttribute('aria-expanded', 'true');
    open = { tip, trigger };
  };
  const later = reason => {
    if (!open) return;
    const delay = tooltipHideDelay(open.trigger.hasAttribute('data-tt-persistent') ? 'persistent' : 'transient', reason);
    clearTimeout(timer);
    if (delay === 0) close(); else if (Number.isFinite(delay)) timer = setTimeout(close, delay);
  };
  const bindTrigger = trigger => {
    const tip = document.getElementById(trigger.dataset.tt);
    if (trigger.hasAttribute('data-tt-persistent')) {
      trigger.addEventListener('click', () => (open?.tip === tip ? close() : show(trigger)));   // persistent는 누를 때만(hover로 뜨지 않음)
      tip.querySelectorAll('[data-tt-close]').forEach(b => b.addEventListener('click', () => { close(); trigger.focus(); }));
      tip.querySelector('[data-tt-link]')?.addEventListener('click', e => e.preventDefault());
      return;
    }
    trigger.addEventListener('pointerenter', () => show(trigger));
    trigger.addEventListener('focus', () => show(trigger));
    trigger.addEventListener('pointerleave', () => later('leave'));
    trigger.addEventListener('blur', event => { if (!tip.contains(event.relatedTarget)) later('blur'); });
    tip.addEventListener('pointerenter', () => clearTimeout(timer));   // 툴팁 위로 옮겨도 유지(WCAG 1.4.13)
    tip.addEventListener('pointerleave', () => later('leave'));
    tip.addEventListener('focusout', event => { if (!tip.contains(event.relatedTarget) && event.relatedTarget !== trigger) later('blur'); });
    tip.querySelectorAll('[data-tt-close], button').forEach(b => b.addEventListener('click', () => close()));
  };
  document.querySelectorAll('[data-tt-live] [data-tt]').forEach(bindTrigger);
  document.addEventListener('saving:rendered', e => e.detail.block.querySelectorAll('[data-tt-live] [data-tt]').forEach(bindTrigger));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && open) { const t = open.trigger; close(); if (open === null && t.hasAttribute('data-tt-persistent')) t.focus(); } });
  document.addEventListener('pointerdown', event => { if (open && !open.tip.contains(event.target) && !open.trigger.contains(event.target)) later('outside'); });
  document.addEventListener('focusin', event => { if (open && open.trigger.hasAttribute('data-tt-persistent') && !open.tip.contains(event.target) && !open.trigger.contains(event.target)) later('outside'); });
})();

// ─── FAB menu(명세 4.1.12) — FAB가 닫기 버튼으로 바뀌고 항목이 FAB 쪽부터 하나씩. 포커스는 닫기 버튼에 남고 Tab으로 위 항목부터 ───
(() => {
  const total = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--md-motion-spring-expressive-slow-effects-duration')) || 327;
  const bindFabMenu = (stage, result) => {
  const menu = stage.querySelector('.m3-fab-menu');
  const toggle = menu.querySelector('[data-fm-toggle]');
  const items = [...menu.querySelectorAll('[data-fm-item]')];
  const setOpen = open => {
    menu.toggleAttribute('data-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    items.forEach((item, i) => {
      item.style.setProperty('--fm-delay', `${fabMenuStagger(i, items.length, { opening: open, total })}ms`);
      item.tabIndex = open ? 0 : -1;
    });
    menu.querySelector('.m3-fab-menu-items').inert = !open;
  };
  setOpen(false);
  toggle.addEventListener('click', () => setOpen(!menu.hasAttribute('data-open')));
  items.forEach(item => item.addEventListener('click', () => {
    if (result) result.textContent = `${item.textContent.trim()} 선택`;
    setOpen(false);
    toggle.focus();
  }));
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.hasAttribute('data-open')) { event.preventDefault(); setOpen(false); toggle.focus(); }
  });
  // 메뉴 밖을 누르거나 포커스가 메뉴를 떠나면 닫는다
  document.addEventListener('pointerdown', event => { if (menu.hasAttribute('data-open') && !menu.contains(event.target)) setOpen(false); });
  menu.addEventListener('focusout', event => { if (menu.hasAttribute('data-open') && !menu.contains(event.relatedTarget)) setOpen(false); });
  return { menu, setOpen };
  };
  // Saving UI 장면 — Expressive · Web menu 견본을 같은 동작으로
  document.addEventListener('saving:rendered', e => e.detail.block.querySelectorAll('[data-fm-live]').forEach(st => bindFabMenu(st, st.querySelector('p[role="status"]'))));
  const stage = document.querySelector('[data-fm-live]');
  if (!stage) return;
  const web = stage.querySelector('.m3-fab-web');
  const { menu, setOpen } = bindFabMenu(stage, document.getElementById('fm-live-result'));

  // Live 아일랜드 — Style(Expressive · Web menu) · Color(Primary · Secondary · Tertiary)
  const bar = document.querySelector('.fm-controls');
  const view = loadView('bw-fm-view', { style: 'expressive', color: 'primary' });
  const COLORS = { primary: 'primary-container', secondary: 'secondary-container', tertiary: 'tertiary-container' };
  const apply = () => {
    setOpen(false);
    const isWeb = view.style === 'web';
    menu.hidden = isWeb;
    web.hidden = !isWeb;
    if (view.color === 'primary') delete menu.dataset.color; else menu.dataset.color = view.color;
    const webFab = web.querySelector('.m3-fab');
    if (view.color === 'primary') delete webFab.dataset.color; else webFab.dataset.color = COLORS[view.color];   // FAB 색 스타일과 같은 set(M3 Color sets)
    bar?.querySelectorAll('[data-fm-axis]').forEach(group => markRadios(group, view[group.dataset.fmAxis]));
    saveView('bw-fm-view', view);
  };
  onIslandPick(bar, '[data-fm-axis]', (value, group) => { view[group.dataset.fmAxis] = value; apply(); });
  apply();
})();

// 계산기 접기(2026-10-04) — 본문이 좁아지지 않게 오른쪽 계산기 열을 아이콘 줄(56)로 접는다.
// 저장값이 없으면 창 폭 1280 미만에서 접힌 채 시작한다. 고른 값은 기억한다.
(() => {
  const shell = document.querySelector('.pl-shell');
  const button = document.getElementById('pl-calc-toggle');
  if (!shell || !button) return;
  const KEY = 'bw-calc-collapsed';
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch {}
  let collapsed = saved === null ? window.innerWidth < 1280 : saved === '1';
  const apply = () => {
    shell.toggleAttribute('data-calc-collapsed', collapsed);
    button.setAttribute('aria-expanded', String(!collapsed));
    const label = collapsed ? '계산기 펼치기' : '계산기 접기';
    button.setAttribute('aria-label', label);
    button.dataset.tip = label;
  };
  button.addEventListener('click', () => {
    collapsed = !collapsed;
    try { localStorage.setItem(KEY, collapsed ? '1' : '0'); } catch {}
    apply();
  });
  apply();
})();

// 가로 스크롤 신호(2026-10-04) — 견본 표 · 줄이 칸을 넘치면 잘린 쪽 가장자리를 흐리게(mask) 해 더 있음을 알린다.
(() => {
  const SEL = '.library-page .pl-item :is(.btn-spec-scroll, .btn-spec-row)';
  const update = el => {
    const max = el.scrollWidth - el.clientWidth;
    el.toggleAttribute('data-scroll-start', max > 1 && el.scrollLeft > 1);
    el.toggleAttribute('data-scroll-end', max > 1 && el.scrollLeft < max - 1);
  };
  const ro = new ResizeObserver(entries => entries.forEach(e => update(e.target)));
  document.querySelectorAll(SEL).forEach(el => {
    el.addEventListener('scroll', () => update(el), { passive: true });
    ro.observe(el);
    update(el);
  });
})();

// Live 데모(2026-10-04) — Button · Icon button · Standard button group · FAB
(() => {
  // Button: 삭제하면 개수가 줄고, 0이면 삭제가 비활성. 되돌리기는 지운 것이 있을 때만 활성.
  const row = document.querySelector('[data-btn-live]');
  if (row) {
    const MAX = 3; let count = MAX;
    const out = row.querySelector('[data-btn-live-count]');
    const del = row.querySelector('[data-btn-live-delete]');
    const undo = row.querySelector('[data-btn-live-undo]');
    const render = () => { out.textContent = `초안 ${count}개`; del.disabled = count === 0; undo.disabled = count === MAX; };
    del.addEventListener('click', () => { if (count > 0) count -= 1; render(); if (del.disabled) undo.focus(); });
    undo.addEventListener('click', () => { if (count < MAX) count += 1; render(); if (undo.disabled) del.focus(); });
    render();
  }
  // Icon button: 0~5 수량 스테퍼. 끝에 닿은 버튼은 비활성.
  const icon = document.querySelector('[data-icon-live]');
  if (icon) {
    const MIN = 0, MAX = 5; let value = 1;
    const out = icon.querySelector('[data-icon-live-value]');
    const steps = [...icon.querySelectorAll('[data-icon-live-step]')];
    const render = () => { out.textContent = String(value); steps.forEach(b => { b.disabled = Number(b.dataset.iconLiveStep) < 0 ? value <= MIN : value >= MAX; }); };
    steps.forEach(b => b.addEventListener('click', () => {
      value = Math.min(MAX, Math.max(MIN, value + Number(b.dataset.iconLiveStep))); render();
      if (b.disabled) steps.find(o => o !== b)?.focus();
    }));
    render();
  }
  // Standard button group: 이전 · 재생(토글) · 다음. 첫 곡 · 마지막 곡에서는 그쪽 버튼이 비활성.
  const group = document.querySelector('[data-group-live]');
  if (group) {
    const COUNT = 5; let track = 1;
    const out = group.querySelector('[data-group-live-track]');
    const steps = [...group.querySelectorAll('[data-group-live-step]')];
    const play = group.querySelector('[data-toggle-button]');
    const render = () => { out.textContent = `${track} / ${COUNT}`; steps.forEach(b => { b.disabled = Number(b.dataset.groupLiveStep) < 0 ? track <= 1 : track >= COUNT; }); };
    steps.forEach(b => b.addEventListener('click', () => {
      track = Math.min(COUNT, Math.max(1, track + Number(b.dataset.groupLiveStep))); render();
      if (b.disabled) play.focus();
    }));
    render();
  }
  // FAB: 누르면 목록 맨 위에 새 메모를 더하고 그 자리로 스크롤한다.
  const fab = document.querySelector('[data-fab-add]');
  if (fab) {
    const scroller = document.querySelector('[data-fab-add-list]');
    const list = scroller.querySelector('ul');
    let n = list.children.length;
    fab.addEventListener('click', () => {
      n += 1;
      const li = document.createElement('li');
      li.textContent = `메모 ${n}`;
      list.prepend(li);
      scroller.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
  }
})();

// ─── M3 Layout 창(명세 5.1, 2026-10-04) — breakpoint에 따라 창 수 · 배치 · 내비게이션을 바꾸고, 프레임에 맞게 축소 ───
(() => {
  const windows = [...document.querySelectorAll('.m3-window')];
  if (!windows.length) return;
  const BP_LABEL = { compact: 'Compact', medium: 'Medium', expanded: 'Expanded', large: 'Large', 'extra-large': 'Extra-large' };
  const NAV_LABEL = { bar: 'Navigation bar', rail: 'Navigation rail', 'rail-expanded': 'Expanded navigation rail' };
  const WIDTH = { compact: 412, medium: 700, expanded: 1000, large: 1280, 'extra-large': 1680 };

  const setRail = (win, expanded) => {
    const rail = win.querySelector(':scope > .m3-nav-rail');
    if (!rail) return;
    rail.dataset.expanded = String(expanded);
    const toggle = rail.querySelector('[data-win-rail-toggle]');
    toggle?.setAttribute('aria-expanded', String(expanded));
    toggle?.setAttribute('aria-label', expanded ? '내비게이션 접기' : '내비게이션 펼치기');
    rail.querySelector('[data-win-fab]')?.toggleAttribute('data-collapsed', !expanded);
  };
  // 선택 표시는 두 창일 때만(M3 List-detail Behavior) — 한 창에서는 고른 항목을 기억만 한다
  const syncSelection = win => {
    const selected = Number(win.dataset.selected || 0);
    win.querySelectorAll('[data-win-list] [role="option"]').forEach((o, i) => o.setAttribute('aria-selected', String(win.dataset.arrange !== 'single' && i === selected)));
  };
  const scale = win => {
    const frame = win.parentElement;
    if (win.hasAttribute('data-fluid')) { win.style.transform = ''; frame.style.height = ''; return; }
    const s = layoutScale(Number(win.dataset.width), frame.clientWidth);
    win.style.transform = s < 1 ? `scale(${s})` : '';
    frame.style.height = `${Math.ceil(win.offsetHeight * s)}px`;
  };
  const fit = win => {
    // 화면(Pages)은 축소하지 않고 실제 폭으로 breakpoint를 정한다
    if (win.hasAttribute('data-fluid')) {
      const w = Math.round(win.parentElement.clientWidth);
      if (!w) return;
      win.dataset.width = String(w);
    }
    const width = Number(win.dataset.width);
    const spec = layoutSpec(width, win.dataset.layout);
    Object.assign(win.dataset, { bp: spec.breakpoint, nav: spec.nav === 'bar' ? 'bar' : 'rail', panes: String(spec.panes), arrange: spec.arrange });
    win.style.setProperty('--win-w', `${width}px`);
    win.style.setProperty('--win-margin', `${spec.margin}px`);
    win.style.setProperty('--win-spacer', `${spec.spacer}px`);
    win.style.setProperty('--win-fixed', `${spec.fixedPane}px`);
    win.style.setProperty('--feed-cols', String(spec.columns));
    if (!win.dataset.railUser) setRail(win, spec.nav === 'rail-expanded');
    // 상세 창의 뒤로 버튼은 한 창일 때만(M3 List-detail Behavior)
    win.querySelectorAll('[data-pane="detail"] > .appbar').forEach(bar => bar.toggleAttribute('data-no-leading', spec.arrange !== 'single'));
    if (spec.arrange === 'single' && !win.dataset.view) win.dataset.view = 'list';
    syncSelection(win);
    const readout = win.closest('.btn-spec-block')?.querySelector('[data-win-readout]');
    if (readout && win.hasAttribute('data-win-live')) {
      const panes = spec.arrange === 'stack' ? '2(아래로)' : String(spec.panes);
      readout.textContent = `${BP_LABEL[spec.breakpoint]} · ${width}dp · 여백 ${spec.margin} · 간격 ${spec.panes > 1 ? spec.spacer : '—'} · 창 ${panes} · ${NAV_LABEL[spec.nav]}`;
    }
    scale(win);
  };

  windows.forEach(win => {
    // 내비게이션 — 바와 레일은 같은 목적지라 현재 항목을 함께 맞춘다
    win.addEventListener('click', event => {
      const item = event.target.closest('.m3-nav-item');
      if (item) {
        const nav = item.closest('nav');
        const index = [...nav.querySelectorAll('.m3-nav-item')].indexOf(item);
        win.querySelectorAll(':scope > nav').forEach(n => n.querySelectorAll('.m3-nav-item').forEach((el, i) => el.setAttribute('aria-current', i === index ? 'page' : 'false')));
        return;
      }
      if (event.target.closest('[data-win-rail-toggle]')) {
        win.dataset.railUser = '1';
        setRail(win, win.querySelector(':scope > .m3-nav-rail').dataset.expanded !== 'true');
        return;
      }
      if (event.target.closest('[data-win-back]')) {
        win.dataset.view = 'list';
        win.querySelectorAll('[data-win-list] [role="option"]')[Number(win.dataset.selected || 0)]?.focus();
      }
    });
    // List-detail — 목록에서 고르면 상세를 바꾸고, 한 창이면 상세 화면으로 넘어간다
    const list = win.querySelector('[data-win-list]');
    if (list) {
      const options = [...list.querySelectorAll('[role="option"]')];
      const select = option => {
        win.dataset.selected = String(options.indexOf(option));
        options.forEach(o => { o.tabIndex = o === option ? 0 : -1; });
        syncSelection(win);
        win.querySelector('[data-detail-title]').textContent = option.dataset.subject;
        win.querySelector('[data-detail-meta]').textContent = option.dataset.meta;
        win.querySelector('[data-detail-body]').textContent = option.dataset.body;
        if (win.dataset.arrange === 'single') {
          win.dataset.view = 'detail';
          win.querySelector('[data-pane="detail"] [data-win-back]')?.focus();
        }
      };
      list.addEventListener('click', event => { const o = event.target.closest('[role="option"]'); if (o) select(o); });
      list.addEventListener('keydown', event => {
        const o = event.target.closest('[role="option"]');
        if (!o) return;
        const i = options.indexOf(o);
        let next = null;
        if (event.key === 'ArrowDown') next = Math.min(options.length - 1, i + 1);
        if (event.key === 'ArrowUp') next = Math.max(0, i - 1);
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = options.length - 1;
        if (next !== null) { event.preventDefault(); options.forEach((el, j) => { el.tabIndex = j === next ? 0 : -1; }); options[next].focus(); return; }
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(o); }
      });
    }
    fit(win);
  });
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(entries => entries.forEach(entry => {
      const win = entry.target.firstElementChild;
      if (win.hasAttribute('data-fluid')) fit(win); else scale(win);
    }));
    windows.forEach(win => ro.observe(win.parentElement));
  }

  // ─── Pages — 주말 산책(가상 매거진): Feed(섹션 필터 · 카드) → 기사(Supporting pane, 관련 기사) ───
  const page = document.querySelector('.m3-window[data-page]');
  const articles = JSON.parse(document.getElementById('page-articles')?.textContent || '{}');
  if (page) {
    let opener = null;
    const show = screen => {
      page.dataset.screen = screen;
      page.dataset.layout = screen === 'article' ? 'supporting' : 'feed';
      fit(page);
    };
    const open = (id, from) => {
      const a = articles[id];
      if (!a) return;
      if (page.dataset.screen === 'feed') opener = from;
      page.querySelector('[data-page-title]').textContent = a.title;
      page.querySelector('[data-page-meta]').textContent = a.meta;
      page.querySelector('[data-page-body]').replaceChildren(...a.paras.map(text => Object.assign(document.createElement('p'), { className: 'm3-article-body', textContent: text })));
      show('article');
      page.querySelectorAll('[data-screen="article"] .m3-pane-scroll, [data-screen="article"].m3-window-body').forEach(el => { el.scrollTop = 0; });
      page.querySelector('[data-page-title]').focus({ preventScroll: true });
    };
    page.addEventListener('click', event => {
      const opening = event.target.closest('[data-open-article]');
      if (opening) { open(opening.dataset.openArticle, opening); return; }
      if (event.target.closest('[data-page-back]')) { show('feed'); opener?.focus(); }
    });
    // 주제 필터 칩 — 고른 주제만 보인다(아무것도 안 고르면 전체). 칩 묶음은 탭 정지 하나 + 좌우 화살표
    const filters = page.querySelector('[data-page-filters]');
    const chips = [...filters.querySelectorAll('.m3-chip')];
    const applyFilter = () => {
      const on = chips.filter(c => c.getAttribute('aria-pressed') === 'true').map(c => c.dataset.pageFilter);
      let shown = 0;
      page.querySelectorAll('[data-screen="feed"] .m3-card').forEach(c => { c.hidden = on.length > 0 && !on.includes(c.dataset.cat); shown += c.hidden ? 0 : 1; });
      page.querySelector('[data-page-empty]').hidden = shown > 0;
    };
    chips.forEach((chip, i) => {
      chip.addEventListener('click', () => {
        const on = chip.getAttribute('aria-pressed') !== 'true';
        chip.setAttribute('aria-pressed', String(on));
        chip.toggleAttribute('data-lead', on);
        applyFilter();
      });
      chip.addEventListener('keydown', event => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
        const to = event.key === 'Home' ? 0 : event.key === 'End' ? chips.length - 1 : step ? (i + step + chips.length) % chips.length : null;
        if (to === null) return;
        event.preventDefault();
        chips.forEach((c, j) => { c.tabIndex = j === to ? 0 : -1; });
        chips[to].focus();
      });
    });
    // 카드 전체를 눌러도 기사가 열린다(Actionable card, 2026-10-20). 키보드는 카드 안 '읽기' 버튼으로 같은 동작을 한다
    // — 카드 자체를 버튼으로 만들면 버튼 안에 버튼이 들어가므로 포인터 클릭만 카드에 받는다.
    page.querySelectorAll('[data-screen="feed"] .m3-card[data-actionable]').forEach(card => {
      card.addEventListener('click', event => {
        if (event.target.closest('button, a')) return;
        const read = card.querySelector('[data-open-article]');
        if (read) open(read.dataset.openArticle, read);
      });
    });

    // 검색(2026-10-20) — 앱 바 돋보기 → 검색 뷰. Compact는 창을 덮는 전체 화면, 넓은 창은 앱 바 오른쪽에 붙는 docked(M3 Search view).
    // 기사 제목 · 주제로 거르고, 결과를 고르면 그 기사를 연다. 키보드는 Search 컴포넌트와 같다(위 · 아래 · Enter · Esc).
    const searchBtn = page.querySelector('[data-page-search]');
    const sView = page.querySelector('#page-search-view');
    if (searchBtn && sView) {
      const sInput = sView.querySelector('[data-page-search-input]');
      const sList = sView.querySelector('[data-page-search-results]');
      const sClear = sView.querySelector('[data-page-search-clear]');
      const entries = Object.entries(articles).map(([id, a]) => ({ id, title: a.title, meta: a.meta }));
      const SEARCH_ICON = 'M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z';
      let sActive = -1;
      let sOptions = [];
      const sSetActive = i => {
        sActive = i;
        sOptions.forEach((li, k) => { li.toggleAttribute('data-active', k === i); li.setAttribute('aria-selected', String(k === i)); });
        if (i >= 0) { sInput.setAttribute('aria-activedescendant', sOptions[i].id); sOptions[i].scrollIntoView({ block: 'nearest' }); }
        else sInput.removeAttribute('aria-activedescendant');
      };
      const sRender = () => {
        const q = sInput.value.trim().toLocaleLowerCase();
        const found = entries.filter(e => !q || `${e.title} ${e.meta}`.toLocaleLowerCase().includes(q));
        sClear.hidden = !sInput.value;
        sList.replaceChildren();
        if (!found.length) {
          const li = document.createElement('li');
          li.className = 'm3-search-empty';
          li.setAttribute('role', 'presentation');
          li.textContent = '결과 없음';
          sList.append(li);
        }
        sOptions = found.map((e, i) => {
          const li = document.createElement('li');
          li.className = 'm3-search-result';
          li.id = `page-search-opt-${i}`;
          li.setAttribute('role', 'option');
          li.setAttribute('aria-selected', 'false');
          li.dataset.article = e.id;
          li.innerHTML = `<svg class="icon icon-symbol" viewBox="0 -960 960 960" aria-hidden="true"><path d="${SEARCH_ICON}"/></svg><span class="m3-search-result-text"></span><span class="m3-search-result-meta"></span>`;
          li.querySelector('.m3-search-result-text').textContent = e.title;
          li.querySelector('.m3-search-result-meta').textContent = e.meta;
          li.addEventListener('pointerdown', event => event.preventDefault());   // 입력칸 포커스 유지
          li.addEventListener('click', () => sChoose(e.id));
          sList.append(li);
          return li;
        });
        sSetActive(-1);
      };
      const sOpen = event => {
        sView.dataset.type = page.dataset.bp === 'compact' ? 'fullscreen' : 'docked';
        sView.toggleAttribute('data-kbd', event?.detail === 0);   // 키보드(Enter · Space)로 열었을 때만 입력칸 링
        sView.hidden = false;
        searchBtn.setAttribute('aria-expanded', 'true');
        sInput.value = '';
        sRender();
        sInput.focus();
      };
      const sClose = ({ restore = true } = {}) => {
        if (sView.hidden) return;
        sView.hidden = true;
        searchBtn.setAttribute('aria-expanded', 'false');
        if (restore) searchBtn.focus();
      };
      const sChoose = id => { sClose({ restore: false }); open(id, searchBtn); };
      searchBtn.addEventListener('click', sOpen);
      sView.querySelector('[data-page-search-close]').addEventListener('click', () => sClose());
      sClear.addEventListener('click', () => { sInput.value = ''; sRender(); sInput.focus(); });
      sInput.addEventListener('input', sRender);
      sInput.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          sSetActive(searchNextIndex(sActive, sOptions.length, event.key));
        } else if (event.key === 'Enter') {
          event.preventDefault();
          const pick = sActive >= 0 ? sOptions[sActive] : sOptions.length === 1 ? sOptions[0] : null;
          if (pick) sChoose(pick.dataset.article);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          if (sActive >= 0) sSetActive(-1); else sClose();
        }
      });
      sView.addEventListener('keydown', event => {
        if (event.key === 'Tab') sView.setAttribute('data-kbd', '');
        if (event.key === 'Escape' && event.target !== sInput) { event.preventDefault(); sClose(); return; }
        if (event.key !== 'Tab' || sView.dataset.type !== 'fullscreen') return;
        const items = [...sView.querySelectorAll(DIALOG_FOCUSABLE)].filter(el => el.offsetParent !== null);
        const target = dialogTabTarget(items.indexOf(document.activeElement), items.length, event.shiftKey);
        if (target >= 0) { event.preventDefault(); items[target].focus(); }
      });
      // docked는 바깥을 누르거나 포커스가 떠나면 닫는다
      document.addEventListener('pointerdown', event => {
        if (!sView.hidden && !sView.contains(event.target) && !searchBtn.contains(event.target)) sClose({ restore: false });
      });
      sView.addEventListener('focusout', event => {
        if (sView.dataset.type === 'docked' && event.relatedTarget && !sView.contains(event.relatedTarget)) sClose({ restore: false });
      });
    }
    show('feed');
  }

  // Live 아일랜드 Window — 창 폭(Compact 412 · Medium 700 · Expanded 1000 · Large 1280 · Extra-large 1680)
  ['lyb', 'lyf', 'lyl', 'lys'].forEach(prefix => {
    const bar = document.querySelector(`.${prefix}-live`);
    const win = document.querySelector(`[data-${prefix}-target] [data-win-live]`);
    if (!bar || !win) return;
    const KEY = `bw-${prefix}-view`;
    const view = { window: 'compact' };
    loadView(KEY, view);
    if (!WIDTH[view.window]) view.window = 'compact';
    const apply = () => {
      win.dataset.width = String(WIDTH[view.window]);
      delete win.dataset.railUser;
      fit(win);
      markRadios(bar.querySelector('[data-win-axis]'), view.window);
      saveView(KEY, view);
    };
    onIslandPick(bar, '[data-win-axis]', value => { view.window = value; apply(); });
    apply();
  });
})();

// ── Saving UI(2026-10-04 시안 · 2026-10-06 라이브): 컴포넌트군별 추천 세트 — 계산기 모드를 따른다(saving.js) ──
// 장면은 실제로 조작된다. 단순한 부품은 이 블록이 다루고, 복잡한 부품(슬라이더 · 탭 · 입력 칸 · 검색 · 시트 · 캐러셀 · 툴바 · 툴팁 · 날짜 · 시간)은
// 각 컴포넌트 블록이 'saving:rendered'(detail.block)에서 같은 동작을 붙인다.
(() => {
  const blocks = [...document.querySelectorAll('[data-saving]')];
  if (!blocks.length) return;
  const svg = (name, cls = '') => `<svg class="icon icon-symbol${cls ? ` ${cls}` : ''}" viewBox="0 -960 960 960" aria-hidden="true"><path d="${SAVING_ICONS[name]}"/></svg>`;
  const CHECKBOX_ICON = '<svg class="m3-checkbox-icon" viewBox="7 7 18 18" aria-hidden="true"><path class="m3-checkbox-check" d="M14,18.2 11.4,15.6 10,17 14,21 22,13 20.6,11.6z"/><path class="m3-checkbox-dash" d="M13.4,15 11,15 11,17 13.4,17 21,17 21,15z"/></svg>';
  let uid = 0;
  const nextId = prefix => `${prefix}-${(uid += 1)}`;
  const rowsList = rows => `<ul class="m3-divider-demo">${rows.map(t => `<li class="m3-divider-demo-item">${t}</li>`).join('')}</ul>`;
  let pendingLive = [];

  function partMarkup(part) {
    if (part.kind === 'live') {
      pendingLive.push(part);
      const box = `<div class="saving-live" data-saving-live="${pendingLive.length - 1}"></div>`;
      return part.label ? `<div class="saving-live-wrap"><span class="saving-live-label">${part.label}</span>${box}</div>` : box;
    }
    if (part.kind === 'appbar') {
      // 프레임 안에서 실제로 스크롤된다 — 맨 위에서는 기본(surface), 내용이 밑으로 지나가면 data-on-scroll 방식(fill)
      const frame = (header, p) => `<div class="appbar-frame appbar-frame--scroll"><div class="appbar-scroller" data-saving-scroller tabindex="0" role="region" aria-label="받은편지함 목록 — 스크롤해 보세요">${header}<ul class="appbar-demo-list">${p.rows.map(r => `<li>${r}</li>`).join('')}</ul></div></div>`;
      const ib = (type, icon, name, extra = '') => `<button type="button" class="btn btn-${type}${extra}" data-icon-only aria-label="${name}">${svg(icon)}</button>`;
      if (part.variant === 'search') {
        return frame(`<header class="appbar" data-variant="search" data-avatar-in data-on-scroll="${part.onScroll}"${part.leading ? '' : ' data-no-leading'}><div class="appbar-row">${part.leading ? ib(part.leading, 'back', '뒤로', ' appbar-leading') : ''}<span class="appbar-search">${svg('search')}<span class="appbar-search-input">${part.placeholder}</span><span class="appbar-avatar" aria-hidden="true">${part.avatar}</span></span></div></header>`, part);
      }
      return frame(`<header class="appbar" data-variant="small" data-on-scroll="${part.onScroll}"><div class="appbar-row">${ib(part.leading, 'back', '뒤로', ' appbar-leading')}<div class="appbar-titles appbar-titles--inline"><span class="appbar-title">${part.title}</span></div><div class="appbar-actions">${part.actions.map(a => ib(a.type, a.icon, a.name)).join('')}</div></div></header>`, part);
    }
    if (part.kind === 'tabs') {
      // 탭 동작(누르기 · 화살표 · Enter/Space · 표시 선)은 Tabs 블록이 붙인다
      const id = nextId('sv-tabs');
      return `<div class="saving-tabs"><div class="m3-tabs" data-variant="${part.variant}" role="tablist" aria-label="${part.name}"><div class="m3-tabs-track">${part.items.map((t, i) =>
        `<button type="button" class="m3-tab" role="tab" id="${id}-tab-${i}" aria-selected="${i === part.selected}" aria-controls="${id}-panel-${i}" tabindex="${i === part.selected ? 0 : -1}"><span class="m3-tab-content"><span class="m3-tab-label">${t}</span></span></button>`).join('')}<span class="m3-tabs-indicator" aria-hidden="true"></span></div></div>${part.items.map((t, i) =>
        `<p class="saving-tab-panel" role="tabpanel" id="${id}-panel-${i}" aria-labelledby="${id}-tab-${i}"${i === part.selected ? '' : ' hidden'}>${t} 준비 목록</p>`).join('')}</div>`;
    }
    if (part.kind === 'fields') {
      // 라벨 올림 · 지우기 · 검증은 Text fields 블록이 붙인다
      return `<div class="saving-fields">${part.items.map(it => {
        const id = nextId('sv-tf');
        return `<div class="m3-tf" data-variant="${part.variant}"${it.value ? ' data-populated' : ''}><div class="m3-tf-field"><fieldset class="m3-tf-outline" aria-hidden="true"><legend><span>${it.label}</span></legend></fieldset><label class="m3-tf-label" for="${id}">${it.label}</label><span class="m3-tf-body"><input type="${it.type || 'text'}" id="${id}" class="m3-tf-input" value="${it.value || ''}"${it.support ? ` aria-describedby="${id}-support"` : ''}></span></div>${it.support ? `<div class="m3-tf-support"><span class="m3-tf-support-text" id="${id}-support">${it.support}</span></div>` : ''}</div>`;
      }).join('')}</div>`;
    }
    if (part.kind === 'sliders') {
      // Sliders 블록이 'saving:rendered'에서 그리고 끌기 · 키보드를 붙인다(크기는 모드별 고정)
      return `<div class="saving-sliders">${part.items.map(it =>
        `<div class="saving-slider-row"><span class="saving-slider-label" aria-hidden="true">${it.label}</span><div class="m3-slider" data-live data-label="${it.label}" data-type="standard" data-min="0" data-max="100" data-values="${it.value}" data-size="${part.size}"${['m', 'l', 'xl'].includes(part.size) ? ` data-icon="${SAVING_ICONS.volume}"` : ''}></div></div>`).join('')}</div>`;
    }
    if (part.kind === 'switches') {
      return `<div class="m3-switch-list saving-switches">${part.items.map(it =>
        `<label class="m3-switch-field"><span class="m3-switch-text">${it.label}</span><span class="m3-switch"><input type="checkbox" role="switch" class="m3-switch-input"${it.checked ? ' checked' : ''}><span class="m3-switch-track"></span><span class="m3-switch-handle"></span></span></label>`).join('')}</div>`;
    }
    if (part.kind === 'snackphone') {
      // 8초 뒤 저절로 사라지고(마우스 · 포커스가 있으면 멈춤), 되돌리기로 바로 닫는다. 아래 버튼으로 다시 띄운다
      return `<div class="saving-phone" data-saving-snack>${rowsList(part.rows)}<button type="button" class="btn btn-tonal saving-phone-action" data-snack-again hidden>${part.again || '사진 보관하기'}</button><div class="m3-snackbar saving-snackbar" role="status"><p class="m3-snackbar-text">${part.text}</p><button type="button" class="m3-snackbar-action" data-snack-action>${part.action}</button></div></div>`;
    }
    if (part.kind === 'navphone') {
      // 휴대폰 화면 한 장: 목록 + 아래 Flexible 내비게이션 바(세로 항목). 목적지를 누르면 바뀐다
      return `<div class="saving-phone saving-phone--nav"><p class="saving-phone-title" data-nav-title>${part.items.find(it => it.active)?.label || ''}</p><ul class="appbar-demo-list">${part.rows.map(r => `<li>${r}</li>`).join('')}</ul><nav class="m3-nav-bar" data-layout="vertical" aria-label="내비게이션 바">${part.items.map(it =>
        `<button type="button" class="m3-nav-item" data-saving-nav${it.active ? ' aria-current="page"' : ''}><span class="m3-nav-indicator"></span><span class="badge-host m3-nav-icon">${svg(it.icon, 'm3-nav-off')}${svg(it.icon, 'm3-nav-on')}</span><span class="m3-nav-label">${it.label}</span></button>`).join('')}</nav></div>`;
    }
    if (part.kind === 'progresscard') {
      return `<div class="saving-progress" data-saving-progress data-start="${part.value}" data-title="${part.title}" data-done="${part.done || '사진 3장을 다 올렸어요'}"><div class="m3-progress-card"><span class="m3-progress" data-type="linear" role="progressbar" aria-label="${part.title}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${part.value}" data-value="${part.value / 100}" data-shape="flat" data-thickness="default" data-placement="edge"></span><span class="m3-progress-card-title">${part.title}</span><span class="m3-progress-card-sub">${part.sub}</span></div><button type="button" class="btn btn-text" data-progress-again hidden>다시 올리기</button></div>`;
    }
    if (part.kind === 'radios') {
      const name = nextId('sv-rb');
      return `<fieldset class="m3-radio-group saving-radios"><legend class="m3-radio-legend">${part.legend}</legend>${part.items.map((t, i) =>
        `<label class="m3-radio-field"><span class="m3-radio"><input type="radio" class="m3-radio-input" name="${name}" value="${i}"${i === part.checked ? ' checked' : ''}><span class="m3-radio-layer"></span><span class="m3-radio-ring"></span></span><span class="m3-radio-text">${t}</span></label>`).join('')}</fieldset>`;
    }
    if (part.kind === 'loading') {
      // 목록 끝(빈자리)에 로딩 표시 — 보이면 잠시 뒤 새 항목이 들어오고, 더 내리면 또 불러온다
      return `<div class="saving-loading" data-saving-loader tabindex="0" role="region" aria-label="메일 목록 — 끝까지 내리면 더 불러와요"><ul class="appbar-demo-list" data-loader-list>${part.rows.map(r => `<li>${r}</li>`).join('')}</ul><div class="saving-loading-slot" data-loader-slot><span class="m3-loading" role="progressbar" aria-label="더 불러오는 중" data-containment="default"><svg viewBox="0 0 48 48" aria-hidden="true"><circle class="m3-loading-container" cx="24" cy="24" r="24"/><g class="m3-loading-rotor"><path class="m3-loading-shape"/></g></svg></span></div></div>`;
    }
    if (part.kind === 'menu') {
      // 정렬 버튼이 메뉴를 열고 닫는다. 항목을 고르면 체크가 옮겨 가고 버튼 글자가 바뀐다
      const id = nextId('sv-menu');
      return `<div class="saving-menu" data-saving-menu><button type="button" class="btn btn-tonal" aria-haspopup="menu" aria-expanded="true" aria-controls="${id}" data-menu-trigger>${svg('sort')}<span data-menu-value>${part.items[part.checked]}</span></button><div class="m3-menu" id="${id}" role="menu" aria-label="${part.section}" data-layout="standard" data-color="standard" data-density="0"><div class="m3-menu-group" role="group" aria-labelledby="${id}-section"><div class="m3-menu-section" id="${id}-section">${part.section}</div>${part.items.map((t, i) =>
        `<div class="m3-menu-item" role="menuitemradio" tabindex="-1" aria-checked="${i === part.checked}"><span class="m3-menu-lead"><svg class="icon icon-symbol m3-menu-check" viewBox="0 -960 960 960" aria-hidden="true"><path d="${SAVING_ICONS.check}"/></svg></span><span class="m3-menu-text"><span class="m3-menu-label">${t}</span></span></div>`).join('')}</div></div></div>`;
    }
    if (part.kind === 'fabphone') {
      // 휴대폰 화면 한 장: 메모 목록 + 오른쪽 아래 확장 FAB(가장자리 16) — Extended FAB Live처럼 내리면 아이콘만 남게 접히고 올리면 펼쳐진다(FAB 블록이 붙임)
      const phone = `<div class="saving-phone" data-saving-fab><div class="m3-fab-scroller" data-fab-scroller tabindex="0" role="region" aria-label="메모 목록 — 내리면 버튼이 접히고 올리면 펼쳐져요"><ul class="m3-fab-list">${part.items.map(t => `<li>${t}</li>`).join('')}</ul></div><button type="button" class="m3-fab saving-fab" data-extended data-color="${part.color}"${part.size ? ` data-size="${part.size}"` : ''}>${svg('edit')}<span class="m3-fab-label">${part.label}</span></button></div>`;
      return part.caption ? `<div class="saving-live-wrap"><span class="saving-live-label">${part.caption}</span>${phone}</div>` : phone;
    }
    if (part.kind === 'list') {
      const n = part.rows.length;
      const pos = i => (n === 1 ? 'single' : i === 0 ? 'first' : i === n - 1 ? 'last' : 'middle');
      const hr = part.divider ? '<li role="presentation" class="m3-li-divider"><hr class="m3-divider" data-inset="middle"></li>' : '';
      return `<div class="m3-li-stage saving-list"><ul class="m3-li-list" data-style="${part.style}">${part.rows.map((r, i) =>
        `<li class="m3-li" data-pos="${pos(i)}"><span class="m3-li-leading" aria-hidden="true"><svg class="icon icon-symbol m3-li-icon" viewBox="0 -960 960 960" aria-hidden="true"><path d="${SAVING_ICONS.mail}"/></svg></span><button type="button" class="m3-li-primary"><span class="m3-li-content"><span class="m3-li-label">${r.label}</span><span class="m3-li-supporting">${r.supporting}</span></span></button></li>`).join(hr)}</ul></div>`;
    }
    if (part.kind === 'dialog') {
      // 휴대폰 화면 한 장: 뒤 목록 + scrim(32%) + Basic dialog. 버튼 · Esc로 닫고, 아래 버튼으로 다시 연다
      const id = nextId('sv-dlg');
      return `<div class="saving-phone" data-saving-dialog>${rowsList(part.behind)}<button type="button" class="btn btn-tonal saving-phone-action" data-dialog-open hidden>${part.opener || '기록 삭제'}</button><span class="saving-scrim" data-dialog-scrim></span><div class="m3-dialog" data-width="md" role="alertdialog" aria-labelledby="${id}-h" aria-describedby="${id}-s"><span class="m3-dialog-headline" id="${id}-h">${part.headline}</span><span class="m3-dialog-supporting" id="${id}-s">${part.supporting}</span><div class="m3-dialog-actions">${part.actions.map(a => `<button type="button" class="btn btn-text" data-dialog-close>${a}</button>`).join('')}</div></div></div>`;
    }
    if (part.kind === 'dividers') {
      // 묶음 안은 Inset, 묶음 사이는 Full width. 구분선은 조작하는 요소가 아니다
      const hr = inset => `<li role="presentation"><hr class="m3-divider"${inset ? ' data-inset="start"' : ''}></li>`;
      return `<ul class="m3-divider-demo">${part.groups.map(g => g.map(t => `<li class="m3-divider-demo-item">${t}</li>`).join(hr(true))).join(hr(false))}</ul>`;
    }
    if (part.kind === 'picker') {
      // 자리만 만들고, 그리기 · 조작은 Date · Time pickers 블록이 'saving:rendered'에서 붙인다(창 없이 그 자리에서)
      const name = part.picker === 'date'
        ? { input: '날짜 입력', modal: '달력에서 날짜 고르기', docked: '입력 칸 아래 달력' }[part.variant]
        : { input: '시간 입력', dial: '시계판에서 시간 고르기' }[part.variant];
      return `<div class="saving-picker" role="group" aria-label="${name}"><div data-saving-picker="${part.picker}:${part.variant}"></div></div>`;
    }
    if (part.kind === 'chips') {
      const filter = part.type === 'filter';
      return `<div class="m3-chip-set saving-chips" role="group" aria-label="${part.name}">${part.items.map(it =>
        `<button type="button" class="m3-chip" data-type="${part.type}"${filter ? ` data-selected="${it.selected ? 'true' : 'false'}" aria-pressed="${it.selected ? 'true' : 'false'}" data-lead data-saving-filter><svg class="icon icon-symbol m3-chip-lead m3-chip-check" viewBox="0 -960 960 960" aria-hidden="true"><path d="${SAVING_ICONS.check}"/></svg>` : '>'}<span class="m3-chip-label">${it.label}</span></button>`).join('')}</div>`;
    }
    if (part.kind === 'checkboxes') {
      const box = (attrs, text) => `<label class="m3-checkbox-field"><span class="m3-checkbox"><input type="checkbox" class="m3-checkbox-input" ${attrs}><span class="m3-checkbox-layer"></span><span class="m3-checkbox-box">${CHECKBOX_ICON}</span></span><span class="m3-checkbox-text">${text}</span></label>`;
      const id = nextId('sv-cb');
      return `<fieldset class="m3-checkbox-group saving-checkboxes" data-saving-checkboxes><legend class="u-visually-hidden">${part.parent}</legend>${box(`data-cb-parent aria-controls="${id}"`, part.parent)}<ul class="m3-checkbox-children" id="${id}">${part.items.map(it =>
        `<li>${box(`data-cb-child${it.checked ? ' checked' : ''}`, it.label)}</li>`).join('')}</ul></fieldset>`;
    }
    if (part.kind === 'cards') {
      return `<div class="m3-card-grid">${part.items.map(it =>
        `<button type="button" class="m3-card" data-type="${part.type}"><span class="m3-card-media m3-card-media--short" aria-hidden="true">${svg('image')}</span><span class="m3-card-content"><span class="m3-card-headline">${it.headline}</span><span class="m3-card-subhead">${it.subhead}</span></span></button>`).join('')}</div>`;
    }
    if (part.kind === 'badgenav') {
      // 목적지를 고르면 그 목적지의 배지를 숨긴다(이미 본 알림)
      const badge = b => !b ? '' : b === 'small' ? '<span class="badge" data-size="small" aria-hidden="true"></span>' : `<span class="badge" data-size="large" aria-hidden="true">${b}</span>`;
      const name = it => `${it.label}${it.badge === 'small' ? ', 새 알림' : it.badge ? `, 새 알림 ${it.badge}개` : ''}`;
      return `<div class="saving-badges"><nav class="badge-nav badge-nav--live" aria-label="내비게이션">${part.items.map(it =>
        `<button type="button" class="badge-nav-item" data-saving-badge data-active="${it.active ? 'true' : 'false'}"${it.active ? ' aria-current="page"' : ''} aria-label="${name(it)}" data-label="${it.label}"><span class="badge-nav-indicator"><span class="badge-host">${svg(it.icon)}${badge(it.badge)}</span></span><span class="badge-nav-label">${it.label}</span></button>`).join('')}</nav><div class="btn-spec-row" role="group" aria-label="배지 되돌리기"><button type="button" class="btn btn-tonal" data-size="xs" data-saving-reset>Reset</button></div></div>`;
    }
    if (part.kind === 'icon') {
      // 토글 아이콘 버튼 — 누를 때마다 켜짐 · 꺼짐
      return `<button type="button" class="btn btn-${part.type}" data-icon-only data-toggle-button aria-pressed="${part.selected ? 'true' : 'false'}" data-saving-part data-ink="icon" aria-label="${part.name}">${svg(part.icon)}</button>`;
    }
    if (part.kind === 'group') {
      // 연결 버튼 그룹(하나만 선택) — 고른 항목만 선택 모양
      return `<span class="btn-group-connected" data-size="s" role="radiogroup" aria-label="${part.name || '기간'}" data-saving-group data-type="${part.type}" data-selected-type="${part.selectedType}">${part.items.map((label, i) =>
        `<button type="button" role="radio" class="btn btn-${i === part.selected ? part.selectedType : part.type}" data-size="s" aria-checked="${i === part.selected}" tabindex="${i === part.selected ? 0 : -1}" data-saving-part><span>${label}</span></button>`).join('')}</span>`;
    }
    if (part.kind === 'split') {
      return `<span class="btn-split"><button type="button" class="btn btn-${part.lead}" data-split="leading" data-saving-part><span>${part.label}</span></button><button type="button" class="btn btn-${part.trail}" data-split="trailing" data-keep-icon data-saving-part data-ink="icon" aria-label="${part.label} 옵션" aria-expanded="false" data-saving-split>${svg('more')}</button></span>`;
    }
    return `<button type="button" class="btn btn-${part.type}" data-saving-part><span>${part.label}</span></button>`;
  }

  // 다른 블록의 Live 견본을 장면으로 — 처음 모습(SAVING_SOURCES)을 복제하고 id를 새로 매겨 원본과 겹치지 않게 한다
  const REF_ATTRS = ['for', 'aria-controls', 'aria-describedby', 'aria-labelledby', 'aria-activedescendant', 'aria-owns', 'data-tt', 'data-result-target'];
  function liveCopy(part, prefix) {
    const tpl = document.createElement('template');
    tpl.innerHTML = SAVING_SOURCES[part.src] || '';
    const root = tpl.content.firstElementChild;
    if (!root) return null;
    const all = [root, ...root.querySelectorAll('*')];
    const map = new Map();
    all.forEach(n => { if (n.id) { const id = `${prefix}-${n.id}`; map.set(n.id, id); n.id = id; } });
    all.forEach(n => {
      REF_ATTRS.forEach(a => { if (n.hasAttribute(a)) n.setAttribute(a, n.getAttribute(a).split(/\s+/).map(v => map.get(v) || v).join(' ')); });
      // 페이지 보기 전환(Type · Color …)이 장면을 바꾸지 않게 대상 표시를 뗀다
      [...n.attributes].filter(a => /^data-[a-z]+-(target|switch)$/.test(a.name) && a.name !== 'data-result-target').forEach(a => n.removeAttribute(a.name));   // 결과 표시 자리는 참조라 남긴다
    });
    (part.tweaks || []).forEach(t => all.filter(n => n.matches(t.sel)).forEach(n => {
      Object.entries(t.attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
      (t.remove || []).forEach(k => n.removeAttribute(k));
      if (t.cls) { n.classList.remove(t.cls[0]); n.classList.add(t.cls[1]); }
    }));
    return root;
  }

  // ── 단순한 부품의 동작 — 장면마다 한 번 위임으로 붙여, 모드가 바뀌어 다시 그려도 그대로 동작한다 ──
  const timers = new WeakMap();   // 블록별 타이머 · 관찰자 — 다시 그릴 때 정리한다
  const later = (block, fn, ms) => { const t = setTimeout(fn, ms); timers.get(block).timeouts.push(t); return t; };

  function wire(block) {
    const scene = block.querySelector('[data-saving-scene]');
    scene.addEventListener('click', event => {
      const t = event.target;
      // Reset — 장면을 처음 모습으로 다시 그리고, 포커스는 새 Reset 버튼에
      if (t.closest('[data-saving-reset]')) { render(block); block.querySelector('[data-saving-reset]')?.focus(); return; }
      const group = t.closest('[data-saving-group] > .btn');
      if (group) {
        const parent = group.parentElement;
        [...parent.children].forEach(b => {
          const on = b === group;
          b.setAttribute('aria-checked', String(on));
          b.tabIndex = on ? 0 : -1;
          b.classList.remove(`btn-${parent.dataset.type}`, `btn-${parent.dataset.selectedType}`);
          b.classList.add(`btn-${on ? parent.dataset.selectedType : parent.dataset.type}`);
        });
        return;
      }
      const toggle = t.closest('[data-toggle-button]');
      if (toggle) { toggle.setAttribute('aria-pressed', String(toggle.getAttribute('aria-pressed') !== 'true')); return; }
      const split = t.closest('[data-saving-split]');
      if (split) { split.setAttribute('aria-expanded', String(split.getAttribute('aria-expanded') !== 'true')); return; }
      const badge = t.closest('[data-saving-badge]');
      if (badge) {
        badge.parentElement.querySelectorAll('[data-saving-badge]').forEach(b => { const on = b === badge; b.dataset.active = String(on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
        badge.querySelector('.badge')?.remove();
        badge.setAttribute('aria-label', badge.dataset.label);
        return;
      }
      const nav = t.closest('[data-saving-nav]');
      if (nav) {
        nav.parentElement.querySelectorAll('[data-saving-nav]').forEach(b => { if (b === nav) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
        const title = nav.closest('.saving-phone').querySelector('[data-nav-title]');
        if (title) title.textContent = nav.querySelector('.m3-nav-label').textContent;
        return;
      }
      const filter = t.closest('[data-saving-filter]');
      if (filter) { const on = filter.getAttribute('aria-pressed') !== 'true'; filter.setAttribute('aria-pressed', String(on)); filter.dataset.selected = String(on); return; }
      const dlgClose = t.closest('[data-dialog-close]');
      if (dlgClose) { showDialog(dlgClose.closest('[data-saving-dialog]'), false); return; }
      const dlgOpen = t.closest('[data-dialog-open]');
      if (dlgOpen) { showDialog(dlgOpen.closest('[data-saving-dialog]'), true); return; }
      const snackAction = t.closest('[data-snack-action]');
      if (snackAction) { showSnack(block, snackAction.closest('[data-saving-snack]'), false); return; }
      const snackAgain = t.closest('[data-snack-again]');
      if (snackAgain) { showSnack(block, snackAgain.closest('[data-saving-snack]'), true); return; }
      const again = t.closest('[data-progress-again]');
      if (again) { runProgress(block, again.closest('[data-saving-progress]'), 0); return; }
      const trigger = t.closest('[data-saving-menu] [data-menu-trigger]');
      if (trigger) { showMenu(trigger.closest('[data-saving-menu]'), trigger.getAttribute('aria-expanded') !== 'true', { focus: event.detail === 0 }); return; }
      const item = t.closest('[data-saving-menu] .m3-menu-item');
      if (item) chooseMenu(item);
    });
    scene.addEventListener('change', event => {
      const box = event.target.closest('[data-saving-checkboxes]');
      if (!box) return;
      const parent = box.querySelector('[data-cb-parent]');
      const children = [...box.querySelectorAll('[data-cb-child]')];
      if (event.target === parent) {
        // 자식은 아직 그대로다: 불확정 · 해제 → 전부 선택, 선택 → 전부 해제
        const value = checkboxParentToggle(checkboxParentState(children.map(c => c.checked)));
        children.forEach(c => { c.checked = value; });
      }
      syncParent(box);
    });
    scene.addEventListener('keydown', event => {
      const t = event.target;
      // 연결 그룹 — 화살표 · Home · End로 고르고 옮겨 간다
      const g = t.closest?.('[data-saving-group] > .btn');
      if (g) {
        const list = [...g.parentElement.children];
        const i = list.indexOf(g);
        const next = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: list.length - 1 }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        const target = list[(next + list.length) % list.length];
        target.click(); target.focus();
        return;
      }
      // 메뉴 — 위아래로 옮기고 Enter · Space로 고른다. Esc는 닫고 버튼으로, Tab은 닫는다
      const menuBox = t.closest?.('[data-saving-menu]');
      if (menuBox) {
        const items = [...menuBox.querySelectorAll('.m3-menu-item')];
        const i = items.indexOf(t);
        if (event.key === 'Escape') { event.preventDefault(); showMenu(menuBox, false, { focus: true }); return; }
        if (i < 0) {
          if (t.matches('[data-menu-trigger]') && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) { event.preventDefault(); showMenu(menuBox, true, { focus: true, last: event.key === 'ArrowUp' }); }
          return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); items[menuNextIndex(i, items.length, event.key)].focus(); }
        else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); items[event.key === 'Home' ? 0 : items.length - 1].focus(); }
        else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseMenu(t); }
        else if (event.key === 'Tab') showMenu(menuBox, false);
        return;
      }
      const dlg = t.closest?.('[data-saving-dialog]');
      if (dlg && event.key === 'Escape' && !dlg.querySelector('.m3-dialog').hidden) { event.preventDefault(); showDialog(dlg, false); }
      // Enter로도 체크박스를 바꾼다(M3)
      if (event.key === 'Enter' && t.matches?.('[data-saving-checkboxes] .m3-checkbox-input')) { event.preventDefault(); t.click(); }
    });
    // 스낵바 — 마우스가 올라가 있거나 포커스가 있으면 사라지지 않는다
    const hold = (event, on) => {
      const snack = event.target.closest?.('.saving-snackbar');
      if (!snack || (!on && snack.contains(event.relatedTarget))) return;
      snack.toggleAttribute('data-hold', on);
      if (on) clearTimeout(snack.savingTimer); else armSnack(block, snack.closest('[data-saving-snack]'));
    };
    scene.addEventListener('pointerover', e => hold(e, true));
    scene.addEventListener('pointerout', e => hold(e, false));
    scene.addEventListener('focusin', e => hold(e, true));
    scene.addEventListener('focusout', e => hold(e, false));
  }

  function syncParent(box) {
    const parent = box.querySelector('[data-cb-parent]');
    const state = checkboxParentState([...box.querySelectorAll('[data-cb-child]')].map(c => c.checked));
    parent.checked = state === 'checked';
    parent.indeterminate = state === 'indeterminate';
  }
  function showDialog(phone, on) {
    phone.querySelector('.m3-dialog').hidden = !on;
    phone.querySelector('[data-dialog-scrim]').hidden = !on;
    const opener = phone.querySelector('[data-dialog-open]');
    opener.hidden = on;
    if (on) phone.querySelector('[data-dialog-close]')?.focus(); else opener.focus();
  }
  function armSnack(block, phone) {
    const snack = phone.querySelector('.saving-snackbar');
    clearTimeout(snack.savingTimer);
    if (snack.hidden || snack.hasAttribute('data-hold')) return;
    snack.savingTimer = later(block, () => showSnack(block, phone, false), 8000);   // 동작 버튼이 있어 넉넉히(M3 4~10초)
  }
  function showSnack(block, phone, on) {
    const snack = phone.querySelector('.saving-snackbar');
    const again = phone.querySelector('[data-snack-again]');
    const hadFocus = snack.contains(document.activeElement);
    snack.hidden = !on;
    again.hidden = on;
    if (on) { snack.removeAttribute('data-hold'); armSnack(block, phone); } else if (hadFocus) again.focus();
  }
  function showMenu(box, on, { focus = false, last = false } = {}) {
    const trigger = box.querySelector('[data-menu-trigger]');
    const menu = box.querySelector('.m3-menu');
    menu.hidden = !on;
    trigger.setAttribute('aria-expanded', String(on));
    if (!focus) return;
    if (on) {
      const items = [...menu.querySelectorAll('.m3-menu-item')];
      (last ? items[items.length - 1] : (items.find(i => i.getAttribute('aria-checked') === 'true') || items[0]))?.focus();
    } else trigger.focus();
  }
  function chooseMenu(item) {
    const box = item.closest('[data-saving-menu]');
    box.querySelectorAll('.m3-menu-item').forEach(i => i.setAttribute('aria-checked', String(i === item)));
    box.querySelector('[data-menu-value]').textContent = item.querySelector('.m3-menu-label').textContent;
    showMenu(box, false, { focus: true });
  }
  // 진행률 — 보이기 시작하면 남은 양을 채우고, 다 올리면 다시 올릴 수 있다
  function setProgress(box, v) {
    const bar = box.querySelector('.m3-progress');
    bar.dataset.value = String(v / 100);
    bar.setAttribute('aria-valuenow', String(Math.round(v)));
    document.dispatchEvent(new CustomEvent('saving:wake'));
  }
  function runProgress(block, box, from) {
    const title = box.querySelector('.m3-progress-card-title');
    const sub = box.querySelector('.m3-progress-card-sub');
    const again = box.querySelector('[data-progress-again]');
    const focusBack = again.contains(document.activeElement);
    again.hidden = true;
    title.textContent = box.dataset.title;
    if (focusBack) { const card = box.querySelector('.m3-progress-card'); card.tabIndex = -1; card.focus(); }   // 숨기는 버튼에 있던 포커스를 카드로
    const steps = [];
    for (let v = from; v < 100; v += 10) steps.push(v);
    steps.push(100);
    steps.forEach((v, i) => later(block, () => {
      setProgress(box, v);
      const files = v >= 100 ? 3 : Math.min(2, Math.floor(v / 34));
      sub.textContent = v >= 100 ? '3/3 · 완료' : `${files}/3 · 약 ${Math.max(1, Math.round((100 - v) / 4))}초 남음`;
      if (v >= 100) { title.textContent = box.dataset.done; again.hidden = false; }
    }, i * 700));
  }
  // 로딩 — 빈자리가 보이면 1.5초 뒤 새 항목 3개, 15개가 되면 끝
  function wireLoader(block, box) {
    const list = box.querySelector('[data-loader-list]');
    const slot = box.querySelector('[data-loader-slot]');
    let busy = false;
    const io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting) || busy) return;
      busy = true;
      later(block, () => {
        const n = list.children.length;
        for (let k = 1; k <= 3; k += 1) { const li = document.createElement('li'); li.textContent = `메일 ${n + k} · 보낸 사람 ${n + k}`; list.append(li); }
        busy = false;
        if (list.children.length >= 15) { io.disconnect(); slot.innerHTML = '<span class="saving-loading-end">모든 메일을 불러왔어요</span>'; }
        else { io.unobserve(slot); io.observe(slot); }   // 아직 보이면 이어서 불러온다
      }, 1500);
    }, { root: box, threshold: 0.6 });
    io.observe(slot);
    timers.get(block).observers.push(io);
  }

  // 아이콘 채움(명세 3.6, 2026-10-17) — 장면 안 Material Symbols 경로를 모드 · 선택 상태에 따라 Outlined ↔ Filled로 바꾼다.
  // 선택을 모양으로 알리는 아이콘(내비게이션 목적지 · 토글)은 두 모드 모두 M3대로 켜짐만 채운다(savingIconFill).
  const OUTLINED_OF = Object.fromEntries(Object.entries(FILLED_ICON_PATHS).map(([outlined, filled]) => [filled, outlined]));
  function iconState(svg) {
    if (svg.matches('.m3-nav-on, .icon-selected')) return 'on';
    if (svg.matches('.m3-nav-off, .icon-unselected')) return 'off';
    const host = svg.closest('[aria-pressed], .badge-nav-item, .m3-nav-item');
    if (!host) return null;
    if (host.hasAttribute('aria-pressed')) return host.getAttribute('aria-pressed') === 'true' ? 'on' : 'off';
    return host.getAttribute('aria-current') === 'page' || host.dataset.active === 'true' ? 'on' : 'off';
  }
  function applyIconFill(scene, mode) {
    scene.querySelectorAll('svg.icon-symbol > path').forEach(path => {
      const d = path.getAttribute('d');
      const outlined = OUTLINED_OF[d] || d;
      if (!(outlined in FILLED_ICON_PATHS)) return;   // 두 모양이 같은 아이콘
      const want = savingIconFill(iconState(path.parentElement), mode) === 'filled' ? FILLED_ICON_PATHS[outlined] : outlined;
      if (want !== d) path.setAttribute('d', want);
    });
  }

  function render(block) {
    const recipe = SAVING_RECIPES[block.dataset.saving];
    if (!recipe) return;
    const mode = document.documentElement.dataset.style === 'light-saving' ? 'light-saving' : 'dark-saving';
    const plan = recipe.modes[mode];
    const old = timers.get(block);   // 앞 장면의 타이머 · 관찰자 정리
    if (old) { old.timeouts.forEach(clearTimeout); old.observers.forEach(o => o.disconnect()); }
    timers.set(block, { timeouts: [], observers: [] });
    block.querySelector('[data-saving-lead]').textContent = plan.lead;
    pendingLive = [];
    const scene = block.querySelector('[data-saving-scene]');
    scene.innerHTML = plan.set.map(row => `<div class="saving-scene-row">${row.map(partMarkup).join('')}</div>`).join('');
    const parts = pendingLive;
    scene.querySelectorAll('[data-saving-live]').forEach(el => {
      const copy = liveCopy(parts[Number(el.dataset.savingLive)], nextId(`sv-${block.dataset.saving}`));
      if (copy) el.replaceChildren(copy);
    });
    scene.querySelectorAll('[data-saving-scroller]').forEach(scroller => {
      const appbar = scroller.querySelector('.appbar');
      scroller.addEventListener('scroll', () => { appbar.dataset.scrolled = String(scroller.scrollTop > 0); }, { passive: true });
    });
    scene.querySelectorAll('[data-saving-checkboxes]').forEach(syncParent);
    scene.querySelectorAll('[data-saving-snack]').forEach(phone => armSnack(block, phone));
    scene.querySelectorAll('[data-saving-loader]').forEach(box => wireLoader(block, box));
    scene.querySelectorAll('[data-saving-progress]').forEach(box => {
      const io = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { io.disconnect(); runProgress(block, box, Number(box.dataset.start)); } });
      io.observe(box);
      timers.get(block).observers.push(io);
    });
    document.dispatchEvent(new CustomEvent('saving:rendered', { detail: { block } }));
    applyIconFill(scene, mode);   // 장면을 다 그린 뒤 — 선택이 바뀌거나 부품이 새로 그려지면 다시 맞춘다
    const iconWatch = new MutationObserver(() => applyIconFill(scene, mode));
    iconWatch.observe(scene, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-pressed', 'aria-current', 'data-active'] });
    timers.get(block).observers.push(iconWatch);
    const hasIcon = !!scene.querySelector('svg.icon-symbol');
    const hasMotion = [...scene.querySelectorAll('*')].some(el => {   // 전환 · 애니메이션이 있는 장면만 모션 규칙을 붙인다
      const cs = getComputedStyle(el);
      return cs.animationName !== 'none' || cs.transitionDuration.split(',').some(d => parseFloat(d) > 0);
    });
    const rules = [...plan.rules, ...SAVING_COMMON_RULES[mode].filter(rule => (rule.kind !== 'icon' || hasIcon) && (rule.kind !== 'motion' || hasMotion))];   // 굵기 · 아이콘 · 모션 공통 규칙(명세 3.2 · 3.6 · 3.5)
    block.querySelector('[data-saving-rules]').innerHTML = rules.map(rule =>
      `<li><span class="saving-rule-axis">${rule.axis}</span><span class="saving-rule-text">${rule.text}</span></li>`).join('');
  }

  blocks.forEach(wire);
  const renderAll = () => blocks.forEach(render);
  renderAll();
  let timer;
  new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(renderAll, 350); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-style'] });
})();

// ─── Pages › Saving UI 비교(2026-10-18) — 주말 산책 피드를 네 장(어두운 M3 · 절감 / 밝은 M3 · 절감)으로. compare.js ───
(() => {
  const host = document.querySelector('[data-compare]');
  const live = document.querySelector('.m3-window[data-page]');
  if (!host || !live) return;
  const source = live.cloneNode(true);   // 사용자가 Pages를 조작하기 전 모습(필터 · 기사 화면이 비교에 섞이지 않게)
  let timer = 0;
  const draw = () => { timer = 0; renderCompare(host, source, schemeInputs()); };

  // Pages 창 Saving UI 스위치(2026-10-20) — 조작 중인 창 그대로 M3 기본 ↔ 지금 모드의 Saving UI 추천을 오간다.
  // 모드(밝은 · 어두운)는 계산기의 모드 전환(html[data-style])을 따르고, 켜져 있을 때 모드가 바뀌면 그 모드 추천으로 다시 입힌다.
  const toggle = document.querySelector('[data-page-saving]');
  if (toggle) {
    const mode = () => (document.documentElement.dataset.style === 'light-saving' ? 'light-saving' : 'dark-saving');
    const sync = () => {
      live.classList.toggle('saving-apply', toggle.checked);
      if (toggle.checked) applySavingRules(live, mode()); else applyM3Baseline(live, mode());   // 끄면 비교 왼쪽과 같은 M3 기본
    };
    toggle.addEventListener('change', sync);
    new MutationObserver(sync)
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-style'] });
    sync();
  }
  // 계산기 슬라이더를 끄는 동안 매번 다시 그리지 않도록 잠깐 모았다가 그린다
  document.addEventListener('bw:scheme-change', () => { clearTimeout(timer); timer = setTimeout(draw, 150); });
  draw();
  // 칸이 패널(412)보다 좁으면 비율대로 줄인다(organisms.css .compare-frame)
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(entries => entries.forEach(({ target }) => {
      const width = target.clientWidth;
      if (width) target.style.setProperty('--compare-scale', String(Math.min(1, width / 412)));
    }));
    host.querySelectorAll('.compare-frame').forEach(frame => ro.observe(frame));
  }
})();
