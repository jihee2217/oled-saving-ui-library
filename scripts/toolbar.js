// Toolbars 규칙 — M3 Docked · Floating toolbar(Expressive). 순수 계산만 두고 DOM은 patterns.js가 다룬다.

/** 치수(MDC · Compose 토큰): 높이 · 폭 64, docked 좌우 16 · 항목 사이 4 ~ 32, floating 안 여백 8 · 사이 4 · 창 여백 16(세로 24), FAB와 8 */
export const TOOLBAR = {
  height: 64, dockedPadding: 16, dockedMinGap: 4, dockedMaxGap: 32, floatingPadding: 8, floatingGap: 4,
  screenOffset: 16, verticalOffset: 24, fabGap: 8, fabMin: 56, fabMax: 80, scrollThreshold: 40,
};

/**
 * 스크롤 반응 — 한 방향으로 threshold 이상 움직이면 바뀐다(Compose FloatingToolbarDefaults.ScrollDistanceThreshold 40).
 * 아래로(내용이 올라감) → 숨김 · 접힘, 위로 → 보임 · 펼침. 맨 위면 늘 보임.
 * state = { shown, acc } → 새 state
 */
export function toolbarScroll(state, dy, scrollTop, { threshold = TOOLBAR.scrollThreshold } = {}) {
  const shown = state?.shown ?? true;
  if (scrollTop <= 0) return { shown: true, acc: 0 };
  let acc = state?.acc ?? 0;
  acc = Math.sign(dy) === Math.sign(acc) || acc === 0 ? acc + dy : dy;   // 방향이 바뀌면 다시 센다
  if (acc >= threshold && shown) return { shown: false, acc: 0 };
  if (acc <= -threshold && !shown) return { shown: true, acc: 0 };
  return { shown, acc };
}

/** 접힘 진행도(0 펼침 · 1 접힘)에 따른 FAB 크기 — 56에서 80(Compose FabSizeRange) */
export function toolbarFabSize(progress) {
  const p = Math.min(1, Math.max(0, progress));
  return Math.round(TOOLBAR.fabMin + (TOOLBAR.fabMax - TOOLBAR.fabMin) * p);
}

/** 화살표 이동(M3 Accessibility: Tab 또는 화살표). 가로는 ← →, 세로는 ↑ ↓, Home · End. 끝에서 멈춘다. */
export function toolbarNextIndex(index, count, key, { vertical = false, rtl = false } = {}) {
  if (count <= 0) return -1;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  const fwd = vertical ? 'ArrowDown' : (rtl ? 'ArrowLeft' : 'ArrowRight');
  const back = vertical ? 'ArrowUp' : (rtl ? 'ArrowRight' : 'ArrowLeft');
  if (key === fwd) return Math.min(count - 1, index + 1);
  if (key === back) return Math.max(0, index - 1);
  return index;
}

/** docked 고르게 배치 — 남는 폭을 항목 사이에 나누되 4 ~ 32로 묶는다. 넘치면 overflow(더보기 메뉴로). */
export function toolbarDockedGap(width, itemsWidth, count, { padding = TOOLBAR.dockedPadding } = {}) {
  if (count <= 1) return { gap: 0, overflow: itemsWidth + padding * 2 > width };
  const free = width - padding * 2 - itemsWidth;
  const gap = free / (count - 1);
  return { gap: Math.min(TOOLBAR.dockedMaxGap, Math.max(TOOLBAR.dockedMinGap, gap)), overflow: gap < TOOLBAR.dockedMinGap };
}
