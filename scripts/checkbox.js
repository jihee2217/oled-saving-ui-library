// Checkbox 부모·자식 규칙 — M3 Guidelines: 자식이 모두 선택이면 부모 선택, 모두 해제면 부모 해제,
// 일부만 선택이면 부모 불확정. 부모를 누르면 불확정·해제 → 전부 선택, 선택 → 전부 해제.

/** children: boolean[] → 'checked' | 'unchecked' | 'indeterminate' */
export function checkboxParentState(children) {
  const on = children.filter(Boolean).length;
  if (on === 0) return 'unchecked';
  return on === children.length ? 'checked' : 'indeterminate';
}

/** 부모를 눌렀을 때 자식에 적용할 값. */
export function checkboxParentToggle(state) {
  return state !== 'checked';
}
