// Navigation 규칙 — M3 Navigation bar · Navigation rail(Expressive), Compose ShortNavigationBar · WideNavigationRail.
// 순수 계산만 두고(단위 테스트 대상) DOM 조작은 patterns.js가 한다.

/**
 * 가운데 정렬(가로 항목) 바의 양쪽 여백 — Compose calculateCenteredContentHorizontalPadding.
 * 한쪽 비율 = (100 − 10 × (항목 수 + 3)) / 2 %. 항목이 7개 이상이면 0.
 */
export function navCenteredPadding(count, barWidth) {
  if (count > 6) return 0;
  const ratio = ((100 - 10 * (count + 3)) / 2) / 100;
  return Math.max(0, Math.round(ratio * barWidth));
}

export const NAV_RAIL = {
  collapsed: 96,
  narrow: 80,
  expandedMin: 220,
  expandedMax: 360,
  itemHorizontalPadding: 20,   // Compose WNRItemHorizontalPadding
};

/**
 * 펼친 레일 폭 — 가장 넓은 항목(또는 머리) + 20, 220 ~ 360으로 자른다(Compose WideNavigationRail 측정).
 */
export function navRailExpandedWidth(widestContent) {
  const want = Math.max(0, widestContent) + NAV_RAIL.itemHorizontalPadding;
  return Math.min(NAV_RAIL.expandedMax, Math.max(NAV_RAIL.expandedMin, want));
}

/**
 * 레일 안 화살표 이동(M3 Navigation rail Accessibility: Tab · 화살표). 세로 목록이라 위 · 아래, 끝에서 멈춘다.
 * 바는 Tab만 쓴다(M3 Navigation bar Accessibility) — 다른 키는 그대로 둔다.
 */
export function navNextIndex(index, count, key) {
  if (count <= 0) return -1;
  if (key === 'ArrowDown') return Math.min(count - 1, index + 1);
  if (key === 'ArrowUp') return Math.max(0, index - 1);
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return index;
}

/**
 * 목적지를 고른 결과 — 이미 고른 항목을 다시 누르면 'reselect'(그 화면 맨 위로 스크롤, M3 Guidelines),
 * 다른 항목이면 'navigate'. 바깥 범위는 'none'.
 */
export function navSelect(current, index, count) {
  if (index < 0 || index >= count) return { active: current, action: 'none' };
  if (index === current) return { active: current, action: 'reselect' };
  return { active: index, action: 'navigate' };
}
