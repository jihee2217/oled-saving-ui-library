// Chips 키보드 규칙 — M3 Accessibility: Tab은 칩 묶음으로, 화살표로 칩 사이 이동, Space · Enter 실행,
// Backspace · Delete로 포커스된 input 칩 제거. 제거 후에는 다음 칩(없으면 이전 칩)으로 포커스를 옮긴다.

/** 화살표 이동 대상 인덱스. key: 'ArrowRight' | 'ArrowLeft' | 'ArrowDown' | 'ArrowUp' | 'Home' | 'End'. RTL이면 좌우 반전. */
export function chipNextIndex(index, count, key, rtl = false) {
  if (count <= 0) return -1;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  const forward = rtl ? ['ArrowLeft', 'ArrowDown'] : ['ArrowRight', 'ArrowDown'];
  const back = rtl ? ['ArrowRight', 'ArrowUp'] : ['ArrowLeft', 'ArrowUp'];
  if (forward.includes(key)) return Math.min(count - 1, index + 1);
  if (back.includes(key)) return Math.max(0, index - 1);
  return index;
}

/** 칩 하나를 지운 뒤 포커스할 인덱스(남은 목록 기준). 남은 칩이 없으면 -1. */
export function chipFocusAfterRemove(removedIndex, remainingCount) {
  if (remainingCount <= 0) return -1;
  return Math.min(removedIndex, remainingCount - 1);
}
