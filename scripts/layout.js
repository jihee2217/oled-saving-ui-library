// M3 Layout 규칙 — m3.material.io/foundations/layout(Breakpoints · Canonical layout examples)와
// androidx WindowSizeClass(600 · 840 · 1200 · 1600) · calculatePaneScaffoldDirective(간격 24 · 고정 창 360/412) ·
// NavigationSuiteScaffold(compact는 바, 그 밖은 레일). DOM은 patterns.js.

export const LAYOUT_BREAKPOINTS = [
  { id: 'compact', min: 0, margin: 16, maxPanes: 1 },
  { id: 'medium', min: 600, margin: 24, maxPanes: 1 },        // M3: 1(권장) 또는 2 — 정보 밀도가 높으면 1
  { id: 'expanded', min: 840, margin: 24, maxPanes: 2 },
  { id: 'large', min: 1200, margin: 24, maxPanes: 2 },
  { id: 'extra-large', min: 1600, margin: 24, maxPanes: 2 },  // 세 번째 창(standard side sheet)은 선택
];

/** 창 폭(dp)의 M3 breakpoint 이름 */
export function layoutBreakpoint(width) {
  let found = LAYOUT_BREAKPOINTS[0];
  for (const bp of LAYOUT_BREAKPOINTS) if (width >= bp.min) found = bp;
  return found.id;
}

/**
 * 레이아웃 지시 — 대표 레이아웃(feed · list-detail · supporting)별로 창 수 · 배치 · 내비게이션 · 여백을 정한다.
 * - 여백: compact 16, 나머지 24 / 창 사이 간격: 24
 * - 고정 창 폭: expanded 360, large · extra-large 412(fixed-and-flexible)
 * - 내비게이션: compact 바, medium · expanded · large 접힌 레일, extra-large 펼친 레일(M3 Breakpoints)
 * - feed 열 수(웹 변환): 1 · 2 · 3 · 3 · 4 — M3는 "breakpoint가 커지면 열을 늘린다"고만 정한다
 */
export function layoutSpec(width, layout = 'feed') {
  const id = layoutBreakpoint(width);
  const bp = LAYOUT_BREAKPOINTS.find(b => b.id === id);
  const wide = bp.min >= 840;
  const spec = {
    breakpoint: id,
    margin: bp.margin,
    spacer: 24,
    fixedPane: bp.min >= 1200 ? 412 : 360,
    nav: id === 'compact' ? 'bar' : id === 'extra-large' ? 'rail-expanded' : 'rail',
    panes: 1,
    arrange: 'single',
    columns: 1,
  };
  if (layout === 'feed') spec.columns = { compact: 1, medium: 2, expanded: 3, large: 3, 'extra-large': 4 }[id];
  if (layout === 'list-detail' || layout === 'panes') { spec.panes = wide ? 2 : 1; spec.arrange = wide ? 'side' : 'single'; }
  if (layout === 'supporting') { spec.panes = 2; spec.arrange = wide ? 'side' : 'stack'; }   // compact · medium은 아래로 쌓는다
  return spec;
}

/** 프레임 폭에 맞춘 축소 비율(1 이상으로 키우지 않는다) */
export function layoutScale(windowWidth, frameWidth) {
  if (!(windowWidth > 0) || !(frameWidth > 0)) return 1;
  return Math.min(1, frameWidth / windowWidth);
}
