// Tooltips 규칙 — M3 Plain · Rich tooltip. 순수 계산만 두고 DOM은 patterns.js가 다룬다.

/** 치수(Compose Tooltip.kt · M3 Specs): plain 높이 24 · 최소 폭 40 · 좌우 8 · 최대 200, rich 최대 320 · 좌우 16, 대상과 4(경계 없는 글이면 8), 꼬리 16×8, 닫힘 1.5초 */
export const TOOLTIP = { plainMaxWidth: 200, richMaxWidth: 320, gap: 4, textGap: 8, caret: { width: 16, height: 8 }, hideDelay: 1500, step: 8, margin: 8 };

const ttClamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));
/** 화면 안으로 밀 때는 8 단위로 움직인다(M3 Dynamic positioning) */
const ttSnap = (value, origin) => origin + Math.round((value - origin) / TOOLTIP.step) * TOOLTIP.step;

/**
 * 위치 — anchor · bounds는 같은 좌표의 { left, top, width, height }, size는 { width, height }.
 * plain: 대상 위 가운데(앱 바 안이면 below) — 위에 자리가 없으면 아래로.
 * rich: 대상 오른쪽 아래(대상을 가리지 않음) — 오른쪽이 넘치면 왼쪽 아래, 아래가 넘치면 위로.
 */
export function tooltipPlace(kind, anchor, size, bounds, { below = false, gap = TOOLTIP.gap } = {}) {
  const m = TOOLTIP.margin;
  const minL = bounds.left + m, maxL = bounds.left + bounds.width - size.width - m;
  const minT = bounds.top + m, maxT = bounds.top + bounds.height - size.height - m;
  if (kind === 'plain') {
    const above = anchor.top - gap - size.height;
    const under = anchor.top + anchor.height + gap;
    let side = below ? 'bottom' : 'top';
    if (side === 'top' && above < minT) side = 'bottom';
    else if (side === 'bottom' && under > maxT && above >= minT) side = 'top';
    const center = anchor.left + anchor.width / 2 - size.width / 2;
    const left = center < minL || center > maxL ? ttSnap(ttClamp(center, minL, maxL), center) : center;
    return { left: ttClamp(left, minL, maxL), top: side === 'top' ? above : under, side, align: 'center' };
  }
  let align = 'end';
  let left = anchor.left + anchor.width;
  if (left > maxL) { align = 'start'; left = anchor.left - size.width; }
  if (left < minL) { align = 'center'; left = ttClamp(ttSnap(anchor.left + anchor.width / 2 - size.width / 2, anchor.left), minL, maxL); }
  let side = 'bottom';
  let top = anchor.top + anchor.height + gap;
  if (top > maxT) { side = 'top'; top = anchor.top - gap - size.height; }
  return { left, top: Math.max(top, minT), side, align };
}

/** 닫힘 규칙 — transient는 대상 · 툴팁을 떠난 뒤 1.5초, persistent는 다른 요소와 상호작용할 때만(마우스 이탈로는 닫히지 않음). Esc는 둘 다 바로. */
export function tooltipHideDelay(kind, reason) {
  if (reason === 'escape') return 0;
  if (kind === 'persistent') return reason === 'outside' ? 0 : Infinity;
  return reason === 'leave' || reason === 'blur' ? TOOLTIP.hideDelay : 0;
}
