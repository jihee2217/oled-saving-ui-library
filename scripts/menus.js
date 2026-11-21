// Menus 규칙 — M3 Menus Accessibility(키보드) · Guidelines(배치 · 선택), Compose DropdownMenuPositionProvider(여백 · 뒤집기).
// 순수 계산만 두고(단위 테스트 대상) DOM 조작은 patterns.js가 한다.

/** 메뉴 항목 이동 — 위 · 아래 화살표(끝에서 감쌈), Home · End. 비활성 항목도 포커스를 받는다(M3 Interactability). */
export function menuNextIndex(index, count, key) {
  if (count <= 0) return -1;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (key === 'ArrowDown') return (index + 1) % count;
  if (key === 'ArrowUp') return (index - 1 + count) % count;
  return index;
}

/** 글자로 이동 — 현재 다음 항목부터 그 글자로 시작하는 첫 항목(감쌈). 없으면 -1. */
export function menuTypeahead(labels, index, char) {
  const c = String(char || '').toLocaleLowerCase();
  if (!c.trim()) return -1;
  for (let step = 1; step <= labels.length; step += 1) {
    const i = (index + step) % labels.length;
    if (String(labels[i]).trim().toLocaleLowerCase().startsWith(c)) return i;
  }
  return -1;
}

/** 선택 결과 — single은 고른 항목만, multi는 고른 항목만 뒤집는다. */
export function menuSelect(selected, index, mode) {
  if (mode === 'single') return selected.map((_, i) => i === index);
  return selected.map((on, i) => (i === index ? !on : on));
}

/** 선택 뒤 메뉴를 닫는가 — single은 닫고, multi는 사람이 닫을 때까지 열어 둔다(M3 Guidelines). */
export function menuClosesOnSelect(mode) {
  return mode !== 'multi';
}

export const MENU_MARGIN = { vertical: 48, horizontal: 8 };   // Compose MenuVerticalMargin · MenuHorizontalMargin

/**
 * 메뉴 위치 — 기준(버튼 · 포인터) 아래, 시작 쪽 정렬. 아래가 모자라고 위가 더 넓으면 위로, 끝이 넘치면 끝 정렬로 뒤집는다.
 * 하위 메뉴(kind 'side')는 부모 항목 옆(끝 쪽, 모자라면 시작 쪽), 윗변을 항목에 맞춘다.
 * 반환: { left, top, originX, originY } — origin은 열림 애니메이션(크기 0.8 → 1)의 기준점.
 */
export function menuPlacement(anchor, menu, viewport, { kind = 'below', rtl = false, margin = MENU_MARGIN, gap = 0, align = 'start', prefer = 'below' } = {}) {
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));
  let left, top, originX, originY;
  if (kind === 'side') {
    const endRoom = rtl ? anchor.left - margin.horizontal : viewport.width - margin.horizontal - anchor.right;
    const toEnd = endRoom >= menu.width || endRoom >= (rtl ? viewport.width - anchor.right : anchor.left) - margin.horizontal;
    const goRight = rtl ? !toEnd : toEnd;
    left = goRight ? anchor.right : anchor.left - menu.width;
    originX = goRight ? 'left' : 'right';
    top = anchor.top;
    originY = 'top';
    if (top + menu.height > viewport.height - margin.horizontal) { top = anchor.bottom - menu.height; originY = 'bottom'; }
  } else {
    const below = viewport.height - margin.vertical - anchor.bottom - gap;
    const above = anchor.top - margin.vertical - gap;
    const down = prefer === 'above' ? !(above >= menu.height || above >= below) : below >= menu.height || below >= above;   // FAB 메뉴는 위 우선
    top = down ? anchor.bottom + gap : anchor.top - gap - menu.height;   // gap — FAB 메뉴(웹)는 FAB와 4 띄움(M3 FAB menu Specs)
    originY = down ? 'top' : 'bottom';
    const startAligned = rtl ? anchor.right - menu.width : anchor.left;
    const endAligned = rtl ? anchor.left : anchor.right - menu.width;
    const fits = x => x >= margin.horizontal && x + menu.width <= viewport.width - margin.horizontal;
    const [first, second] = align === 'end' ? [endAligned, startAligned] : [startAligned, endAligned];   // 끝 정렬 우선(FAB 메뉴)
    left = fits(first) ? first : fits(second) ? second : first;
    originX = (left === startAligned) !== rtl ? 'left' : 'right';
  }
  left = clamp(left, margin.horizontal, viewport.width - margin.horizontal - menu.width);
  top = clamp(top, margin.horizontal, viewport.height - margin.horizontal - menu.height);
  return { left, top, originX, originY };
}
