import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('갤러리 구조가 M3 IA(Styles / Components / Layout / Pages)를 따른다', async () => {
  const html = await readFile(new URL('../patterns.html', import.meta.url), 'utf8');
  for (const panel of ['styles', 'components', 'layout', 'pages']) {
    assert.ok(html.includes(`data-panel="${panel}"`), `탭 data-panel="${panel}" 누락`);
    assert.ok(html.includes(`id="panel-${panel}"`), `패널 id="panel-${panel}" 누락`);
  }
  // 아토믹 단계는 갤러리 탐색 구조에서 내려왔다(명세 5장).
  for (const removed of ['data-panel="atoms"', 'data-panel="molecules"', 'data-panel="organisms"']) {
    assert.ok(!html.includes(removed), `${removed}가 남아 있습니다`);
  }
});

test('Components 패널이 M3 6개 카테고리로 나뉜다', async () => {
  const html = await readFile(new URL('../patterns.html', import.meta.url), 'utf8');
  // 카테고리 필터 칩 대신 컴포넌트 목록(nav)이 섹션에서 만들어진다.
  assert.ok(html.includes('class="pl-comp-nav"'), '컴포넌트 목록 누락');
  for (const category of ['actions', 'communication', 'containment', 'navigation', 'selection', 'text-inputs']) {
    assert.ok(html.includes(`data-category="${category}"`), `카테고리 ${category} 섹션 누락`);
  }
});

test('Styles 패널이 M3 Styles 메뉴(m3.material.io/styles)를 따른다', async () => {
  const html = await readFile(new URL('../patterns.html', import.meta.url), 'utf8');
  const js = await readFile(new URL('../scripts/patterns.js', import.meta.url), 'utf8');
  const panel = html.slice(html.indexOf('id="panel-styles"'), html.indexOf('id="panel-components"'));
  assert.ok(panel.includes('class="pl-comp-nav"'), '스타일 메뉴 누락');
  for (const category of ['color', 'spacing', 'typography', 'shape', 'elevation', 'motion', 'icons', 'states']) {
    assert.ok(panel.includes(`data-category="${category}"`), `스타일 섹션 ${category} 누락`);
  }
  // 메뉴 이름·순서는 M3 사이트 그대로(States는 라이브러리 견본이라 끝에 둔다).
  const menu = js.slice(js.indexOf('const STYLE_MENU'), js.indexOf('];', js.indexOf('const STYLE_MENU')));
  const labels = [...menu.matchAll(/label: '([^']+)'/g)].map(m => m[1]);
  assert.deepEqual(labels, ['Color', 'Elevation', 'Icons', 'Motion', 'Shape', 'Spacing', 'Typography', 'States']);
  // 메뉴 항목이 가리키는 견본이 모두 패널에 있다.
  for (const [, items] of menu.matchAll(/items: \[([^\]]+)\]/g)) {
    for (const [, name] of items.matchAll(/'([^']+)'/g)) {
      assert.ok(panel.includes(`<div class="pl-item-name">${name.replace(/&/g, '&amp;')}</div>`), `스타일 견본 「${name}」 누락`);
    }
  }
  for (const demo of ['m3-color-roles', 'm3-color-addons', 'm3-color-palettes', 'm3-color-static', 'm3-shape-tiles', 'data-shape-live', 'm3-space-box', 'data-space-screen', 'data-space-list', 'm3-elev-tiles', 'm3-elev-stage', 'data-icon-catalog', 'data-icon-axis="weight"', 'm3-motion-physics', 'm3-motion-easing', 'm3-motion-transitions', 'data-type-config', 'data-type-live', 'm3-type-tabular', 'data-type-clock', 'data-state-config', 'data-state-live', 'data-state-card', 'm3-state-ring-in']) {
    assert.ok(panel.includes(demo), `${demo} 견본 누락`);
  }
});

test('M3 36종 컴포넌트 핵심 요소가 마크업에 정상 반영되어 있다', async () => {
  const html = await readFile(new URL('../patterns.html', import.meta.url), 'utf8');
  // Buttons
  assert.ok(html.includes('btn-filled'));
  assert.ok(html.includes('btn-outlined'));
  assert.ok(html.includes('btn-tonal'));
  assert.ok(html.includes('btn-elevated'));
  assert.ok(html.includes('btn-group'));
  assert.ok(html.includes('btn-group-connected'));   // Segmented buttons → M3 Expressive connected button group
  assert.ok(html.includes('btn-group-connected'));
  assert.ok(html.includes('class="btn-split"') && html.includes('data-split="trailing"'));   // Split button (M3 Expressive, 명세 4.1.10)
  assert.ok(html.includes('data-icon-only') && html.includes('btn-standard'));   // Icon buttons (명세 4.1.9)
  assert.ok(html.includes('class="m3-fab"') && html.includes('data-size="l"'));   // FAB · Medium · Large (명세 4.1.11)
  assert.ok(html.includes('m3-fab-label') && html.includes('data-fab-live'));   // Extended FAB + 스크롤 접힘

  // Inputs & Selection
  assert.ok(html.includes('id="fab-menu-variants"') && html.includes('data-fm-toggle') && html.includes('data-menu-gap="4"'), 'FAB menu 견본 누락(명세 4.1.12)');
  assert.ok(html.includes('id="app-bars-variants"') && html.includes('data-appbar-axis="type"') && html.includes('data-appbar-row="large"'), 'App bars 견본 누락(명세 4.4.1)');
  assert.ok(html.includes('id="plain-tooltip-variants"') && html.includes('id="rich-tooltip-variants"') && html.includes('role="tooltip"'), 'Tooltips 견본 누락(명세 4.7.3)');
  assert.ok(html.includes('id="docked-toolbar-variants"') && html.includes('id="floating-toolbar-variants"') && html.includes('role="toolbar"'), 'Toolbars 견본 누락(명세 4.4.5)');
  assert.ok(html.includes('id="text-fields-variants"') && html.includes('class="m3-tf-input"'), 'Text fields 견본 누락(명세 4.8.1)');
  assert.ok(html.includes('search-bar'));
  assert.ok(html.includes('id="search-bar-variants"') && html.includes('id="search-view-variants"') && html.includes('role="combobox"'), 'Search 견본 누락(명세 4.4.3)');
  assert.ok(html.includes('m3-checkbox'));
  assert.ok(html.includes('id="snackbar-variants"') && html.includes('data-snackbar-live'), 'Snackbar 견본 누락(명세 4.7.2)');
  assert.ok(html.includes('id="tabs-variants"') && html.includes('role="tablist"'), 'Tabs 견본 누락(명세 4.4.4)');
  assert.ok(html.includes('id="switch-variants"') && html.includes('role="switch"'), 'Switch 견본 누락(명세 4.6.6)');
  assert.ok(html.includes('id="radio-button-variants"') && html.includes('class="m3-radio-input"'), 'Radio button 견본 누락(명세 4.6.4)');
  assert.ok(html.includes('toggle-track'));
  assert.ok(html.includes('m3-chip-set'));
  assert.ok(html.includes('sample-range'));
  assert.ok(html.includes('id="sliders-variants"') && html.includes('data-slider-axis="size"'), 'Slider 견본 누락(명세 4.6.5)');

  // Navigation & Containment
  assert.ok(html.includes('nav-rail'));
  // Navigation bar · rail(M3 Expressive, 명세 4.4.2) — 옛 '하단 탭바' · 'Navigation Rail (세로형 레일)' 견본을 바꿨다
  assert.ok(html.includes('id="navigation-bar-variants"') && html.includes('class="m3-nav-bar"'), 'Navigation bar 견본 누락');
  assert.ok(html.includes('id="navigation-rail-variants"') && html.includes('class="m3-nav-rail"'), 'Navigation rail 견본 누락');
  assert.ok(!html.includes('하단 탭바 (Navigation Bar)'), '옛 하단 탭바 항목이 남아 있음');
  assert.ok(html.includes('id="bottom-sheet-variants"') && html.includes('id="side-sheet-variants"'), 'Sheets 견본 누락(명세 4.5.6)');
  assert.ok(html.includes('id="dialogs-variants"') && html.includes('role="alertdialog"') && html.includes('dlg-live-full'));
  assert.ok(html.includes('id="divider-variants"') && html.includes('data-inset="middle"'));
  assert.ok(html.includes('m3-carousel-frame') && html.includes('data-carousel-showall'));
  assert.ok(html.includes('id="menus-variants"') && html.includes('data-menu-popup') && html.includes('id="split-menu"') && html.includes('role="menuitemcheckbox"'));   // Menus(명세 4.6.3) · Split button 메뉴 교체
  assert.ok(html.includes('id="loading-indicator-variants"') && html.includes('data-loading-live') && html.includes('id="progress-indicators-variants"') && html.includes('data-progress-live'));   // Loading indicator · Progress indicators(명세 4.3.1 · 4.3.2)
  assert.ok(html.includes('id="lists-variants"') && html.includes('data-list-live="multiaction"') && html.includes('role="listbox"'));   // Lists(명세 4.5.5)
  assert.ok(html.includes('data-dp-sample="docked"') && html.includes('data-dp-docked'));
  assert.ok(html.includes('data-tp-sample="dial:vertical:12"') && html.includes('data-tp-live'));

  // Layout(M3 Foundations › Layout, 명세 5.1) & Pages
  assert.ok(html.includes('id="layout-breakpoints"') && html.includes('id="layout-feed"') && html.includes('id="layout-list-detail"') && html.includes('id="layout-supporting-pane"'), 'Layout 견본 누락');
  assert.ok(html.includes('class="m3-window"') && html.includes('data-win-axis="window"'));
  assert.ok(html.includes('data-page') && html.includes('주말 산책'));
  // Overview(라이브러리 소개, 2026-10-18) — 레일 첫 탭, 구성 카드는 각 레일 탭으로 이동
  const firstTab = html.match(/<button class="pl-tab[^"]*" id="(tab-[a-z]+)"/)[1];
  assert.equal(firstTab, 'tab-overview');
  assert.ok(html.includes('id="panel-overview" role="tabpanel" aria-labelledby="tab-overview"'));
  for (const panel of ['styles', 'components', 'layout', 'pages']) assert.ok(html.includes(`data-goto-panel="${panel}"`), panel);
  // 견본에 연구 용어를 쓰지 않는다 — 가상 매거진 앱 '주말 산책'(2026-10-18)
  assert.ok(!html.includes('EcoTech') && !/OLED 패널 측정|발광 면적을 줄이는 화면/.test(html), 'Layout · Pages 견본에 연구 용어가 남아 있음');
});

test('타이포그래피 하한 Regular(400) 규칙이 지켜지며 300(Light)이 사용되지 않는다', async () => {
  // 2026-10-17: 하한은 옛 atoms.css 규칙이 아니라 Saving UI 장면 타입 토큰(organisms.css · saving.js savingWeight)이 맡는다
  for (const file of ['atoms', 'molecules', 'organisms', 'foundations', 'm3-styles', 'tokens']) {
    const css = await readFile(new URL(`../styles/${file}.css`, import.meta.url), 'utf8');
    assert.ok(!/font-weight:\s*300\b/.test(css), `${file}.css에 font-weight: 300이 남아있습니다.`);
  }
  const org = await readFile(new URL('../styles/organisms.css', import.meta.url), 'utf8');
  const dark = org.match(/html\[data-style="dark-saving"\] :is\(\.saving-scene, \.saving-apply\) \{([^}]+)\}/)[1];
  const weights = [...dark.matchAll(/--md-type-[a-z-]+: (\d+) /g)].map(m => Number(m[1]));
  assert.equal(weights.length, 30);
  assert.ok(Math.min(...weights) >= 400, '어두운 절감형 장면 굵기가 400 아래로 내려가면 안 됩니다.');
});

test('Shape 토큰 — M3 코너 반경 10단계 · 비대칭 모서리', async () => {
  const css = await readFile(new URL('../styles/tokens.css', import.meta.url), 'utf8');
  const scale = { none: '0px', xs: '4px', sm: '8px', md: '12px', lg: '16px', 'lg-increased': '20px', xl: '28px', 'xl-increased': '32px', xxl: '48px', full: '9999px' };
  for (const [key, value] of Object.entries(scale)) assert.ok(css.includes(`--md-shape-${key}: ${value};`), key);
  for (const key of ['xs-top', 'lg-top', 'lg-start', 'lg-end', 'xl-top']) assert.ok(css.includes(`--md-shape-${key}:`), key);
});

test('Spacing 토큰 — M3 System spacing tokens 18개(space100 = 8dp)', async () => {
  const css = await readFile(new URL('../styles/tokens.css', import.meta.url), 'utf8');
  const tokens = { 0: 0, 25: 2, 50: 4, 75: 6, 100: 8, 125: 10, 150: 12, 175: 14, 200: 16, 250: 20, 300: 24, 400: 32, 450: 36, 500: 40, 600: 48, 700: 56, 800: 64, 900: 72 };
  for (const [name, dp] of Object.entries(tokens)) {
    assert.equal(dp, Number(name) * 8 / 100, `space${name} = 8dp × ${Number(name) / 100}`);
    assert.ok(css.includes(`--md-space-${name}: ${dp}px;`), `space${name}`);
  }
});

test('조정 UI 규칙: 페이지 아일랜드는 모든 견본이 따르는 옵션만, 나머지는 Live 아일랜드(2026-09-28)', async () => {
  const html = await readFile(new URL('../patterns.html', import.meta.url), 'utf8');
  const js = await readFile(new URL('../scripts/patterns.js', import.meta.url), 'utf8');
  const menu = js.slice(js.indexOf('const COMPONENT_MENU'), js.indexOf('];', js.indexOf('const COMPONENT_MENU')));
  const labels = [...menu.matchAll(/label: '([^']+)'/g)].map(m => m[1]);
  // FAB는 Buttons 페이지 옵션(Size · Shape · Type · Icon)을 따를 수 없어 풀네임 메뉴로 따로 둔다(알파벳 순서).
  assert.ok(labels.includes('Floating action button'));
  const sorted = [...labels].sort((a, b) => a.localeCompare(b, 'en'));
  assert.deepEqual(labels, sorted, '컴포넌트 메뉴가 알파벳 순서가 아님');
  const buttonItems = menu.match(/label: 'Buttons', items: \[([^\]]+)\]/)[1];
  assert.ok(!buttonItems.includes('FAB'), 'Buttons 페이지에 FAB 견본이 남아 있음');
  // Carousel Layout · Width는 Live에만 적용 → Live 아일랜드
  assert.match(html, /class="view-controls carousel-controls"[^>]*data-placement="live"/);
  // Icons 필터는 카탈로그 전체 옵션 → 페이지 아일랜드(보기 바)
  assert.match(html, /class="view-controls m3-icon-filter-bar"/);
  // Styles Live 조작 줄은 Live 아일랜드로 묶는다
  assert.ok(js.includes('const LIVE_CONTROLS') && js.includes("'motion-physics': ['Scheme', 'Web']"));
  // Cards States 표도 Type을 따른다
  assert.ok(js.includes("tr[data-card-type]"));
});
