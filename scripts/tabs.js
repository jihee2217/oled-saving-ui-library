// Tabs 규칙 — M3 Tabs(Primary · Secondary, Fixed · Scrollable), WAI-ARIA tabs(화살표로 포커스, Enter · Space로 선택).
// 순수 계산만 두고 DOM은 patterns.js가 다룬다.

export const TABS = { minIndicator: 24, scrollEdge: 52, scrollMinTab: 90, padding: 16 };   // Compose PrimaryIndicator · ScrollableTabRow

/** 화살표 이동 — 끝에서 감싼다(WAI-ARIA), Home · End. RTL 가로는 좌우 반대. 비활성 칸은 건너뛴다. */
export function tabsNextIndex(index, count, key, { rtl = false, disabled = [] } = {}) {
  if (count <= 0) return -1;
  const ok = i => !disabled.includes(i);
  const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[key];
  if (key === 'Home' || key === 'End') {
    const order = [...Array(count).keys()];
    if (key === 'End') order.reverse();
    return order.find(ok) ?? index;
  }
  if (!step) return index;
  for (let k = 1; k <= count; k += 1) {
    const i = (index + step * k + count * k) % count;
    if (ok(i)) return i;
  }
  return index;
}

/**
 * 표시기 위치 — primary는 내용(라벨 · 아이콘) 폭(최소 24)을 내용 가운데에, secondary는 칸 전체 폭.
 * tab = { left, width }, content = { left, width } (같은 기준 좌표)
 */
export function tabsIndicator(variant, tab, content) {
  if (variant === 'secondary') return { left: tab.left, width: tab.width };
  const width = Math.max(TABS.minIndicator, content.width);
  return { left: content.left + content.width / 2 - width / 2, width };
}

/** 스크롤형에서 선택 칸이 보이도록 할 scrollLeft — 칸을 가운데로(경계 안으로 자름, Compose ScrollableTabRow). */
export function tabsScrollTo(tab, viewport, scrollWidth) {
  const target = tab.left + tab.width / 2 - viewport / 2;
  return Math.max(0, Math.min(scrollWidth - viewport, Math.round(target)));
}
