// Snackbar 규칙 — Compose SnackbarHost(SnackbarDuration · 한 번에 하나, 순서대로), M3 Snackbar Accessibility.
// 순수 계산만 둔다.

/** 표시 시간(ms) — 짧게 4000 · 길게 10000(Compose). 동작 버튼이 있으면 사람이 닫을 때까지(WCAG 2.2.1 — 시간 제한 없는 조작). */
export function snackbarDuration({ length = 'short', action = false } = {}) {
  if (action || length === 'indefinite') return Infinity;
  return length === 'long' ? 10000 : 4000;
}

/** 대기열 — 새 스낵바는 뒤에 붙고, 지금 것이 닫히면 다음 것을 보인다(한 번에 하나, M3 Guidelines). 같은 글이 이미 기다리면 넣지 않는다. */
export function snackbarEnqueue(queue, item) {
  if (queue.some(q => q.text === item.text && q.action === item.action)) return queue;
  return [...queue, item];
}
export function snackbarNext(queue) {
  return { current: queue[0] || null, queue: queue.slice(1) };
}

/** 줄 수 — 글이 한 줄 폭을 넘으면 2(높이 68), 동작 글이 길면(폭의 절반 넘음) 아래 줄로. */
export function snackbarLayout({ textWidth, available, actionWidth = 0 }) {
  const longAction = actionWidth > 0 && actionWidth > available / 2;
  const room = longAction ? available : available - actionWidth;
  return { lines: textWidth > room ? 2 : 1, longAction };
}
