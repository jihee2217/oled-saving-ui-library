// Search 규칙 — M3 Search(검색창 → 검색 뷰), WAI-ARIA combobox(입력 + 목록). 순수 계산만 둔다.

/** 제안 목록 거르기 — 빈 검색어면 처음 max개(최근 검색), 아니면 대소문자 무시 포함 검색. */
export function searchFilter(items, query, max = 6) {
  const q = String(query || '').trim().toLocaleLowerCase();
  const list = q ? items.filter(item => String(item).toLocaleLowerCase().includes(q)) : items;
  return list.slice(0, max);
}

/**
 * 결과 목록 이동 — -1은 입력칸. 아래 화살표로 입력칸에서 첫 결과로, 위 화살표로 첫 결과에서 입력칸으로 돌아간다.
 * 끝에서는 멈춘다. Home · End는 입력칸 글자 이동이라 다루지 않는다.
 */
export function searchNextIndex(index, count, key) {
  if (count <= 0) return -1;
  if (key === 'ArrowDown') return Math.min(count - 1, index + 1);
  if (key === 'ArrowUp') return Math.max(-1, index - 1);
  return index;
}

export const SEARCH_BAR = { height: 56, minWidth: 360, maxWidth: 720 };   // MDC · Compose SearchBarTokens, Compose SearchBarMin/MaxWidth
