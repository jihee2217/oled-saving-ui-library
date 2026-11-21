// Lists 규칙 — M3 Lists Specs · Accessibility, MDC ListItemLayout.updateAppearance, Compose ListItemType.
// 순수 계산만 두고(단위 테스트 대상) DOM 조작은 patterns.js가 한다.

/**
 * 키보드 이동 대상 인덱스(M3 Lists › Keyboard navigation).
 * 아래 · 오른쪽 = 다음, 위 · 왼쪽 = 이전, 끝에서는 반대쪽 끝으로 감싼다. Home · End는 처음 · 끝.
 * focusable: 각 항목이 포커스를 받을 수 있는지(비활성은 false — 건너뛴다). RTL이면 좌우 반전.
 * 포커스 가능한 항목이 없으면 -1.
 */
export function listNextIndex(index, focusable, key, rtl = false) {
  const count = focusable.length;
  if (!focusable.some(Boolean)) return -1;
  const next = rtl ? ['ArrowDown', 'ArrowLeft'] : ['ArrowDown', 'ArrowRight'];
  const prev = rtl ? ['ArrowUp', 'ArrowRight'] : ['ArrowUp', 'ArrowLeft'];
  let step = 0;
  let from = index;
  if (key === 'Home') { step = 1; from = -1; }
  else if (key === 'End') { step = -1; from = count; }
  else if (next.includes(key)) step = 1;
  else if (prev.includes(key)) step = -1;
  else return index;
  for (let i = 1; i <= count; i += 1) {
    const raw = from + step * i;
    if ((key === 'Home' || key === 'End') && (raw < 0 || raw >= count)) break;
    const candidate = ((raw % count) + count) % count;
    if (focusable[candidate]) return candidate;
  }
  return index;
}

/** Tab으로 목록에 들어올 때 포커스할 항목 — 선택된 항목이 있으면 그 첫 항목, 없으면 처음 포커스 가능한 항목. */
export function listEntryIndex(selected, focusable = selected.map(() => true)) {
  const chosen = selected.findIndex((on, i) => on && focusable[i]);
  if (chosen >= 0) return chosen;
  return focusable.findIndex(Boolean);
}

/** 선택 결과. mode 'single' — 고른 항목만 선택(다시 눌러도 유지), 'multi' — 고른 항목만 뒤집는다. */
export function listSelect(selected, index, mode) {
  if (mode === 'single') return selected.map((_, i) => i === index);
  return selected.map((on, i) => (i === index ? !on : on));
}

/** 보이는 항목의 자리(MDC state_first · middle · last · single). 모서리 모양을 정한다. */
export function listPositions(count) {
  if (count <= 0) return [];
  if (count === 1) return ['single'];
  return Array.from({ length: count }, (_, i) => (i === 0 ? 'first' : i === count - 1 ? 'last' : 'middle'));
}

/** 항목 줄 수(Compose ListItemType) — overline과 보조 글자가 둘 다 있거나 보조 글자가 여러 줄이면 3, 하나만 있으면 2, 없으면 1. */
export function listItemLines({ overline = false, supporting = false, supportingMultiline = false } = {}) {
  if ((overline && supporting) || supportingMultiline) return 3;
  if (overline || supporting) return 2;
  return 1;
}
