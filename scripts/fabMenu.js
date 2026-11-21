// FAB menu 규칙 — M3 Expressive FAB menu(Compose FloatingActionButtonMenu · FabMenuBaselineTokens). DOM은 patterns.js.

// 치수는 CSS(.m3-fab-menu)가 맡는다: 닫기 버튼 56(full · 아이콘 20) · 메뉴와 8, 항목 높이 56 · 사이 4 · 앞뒤 24 · 아이콘 24 · 아이콘-글 8, 그림자 3, 항목 2 ~ 6.

/**
 * 항목이 나타나는 순서 지연 — FAB에 가까운 항목(아래)부터 하나씩(Compose stagger, SlowEffects).
 * index는 위에서 0부터, total ms를 항목 수로 나눈다. 닫을 때는 위 항목부터 거꾸로.
 */
export function fabMenuStagger(index, count, { opening = true, total = 327 } = {}) {
  if (count <= 1) return 0;
  const step = total / count;
  const order = opening ? count - 1 - index : index;
  return Math.round(order * step);
}
