// Dialogs 로직 — M3 Dialogs Accessibility · Guidelines.

/** 대화상자 안의 포커스 대상(보이는 것, 비활성 제외) — DOM 순서. */
export const DIALOG_FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * Tab 순환 — 마지막에서 Tab이면 처음으로, 처음에서 Shift+Tab이면 마지막으로(M3 Keyboard navigation).
 * 순환이 필요 없으면 -1(브라우저 기본 이동).
 */
export function dialogTabTarget(index, count, shift) {
  if (count <= 0) return -1;
  if (shift && index <= 0) return count - 1;
  if (!shift && index >= count - 1) return 0;
  return -1;
}

/** 전체 화면 대화상자의 저장하지 않은 변경 여부 — 처음 값과 지금 값을 필드별로 비교한다. */
export function dialogHasChanges(initial, current) {
  const keys = new Set([...Object.keys(initial || {}), ...Object.keys(current || {})]);
  for (const key of keys) if (String(initial?.[key] ?? '').trim() !== String(current?.[key] ?? '').trim()) return true;
  return false;
}
