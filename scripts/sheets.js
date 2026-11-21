// Sheets 규칙 — M3 Bottom sheets · Side sheets, MDC BottomSheetBehavior · Compose SheetDefaults(임계 56).
// 순수 계산만 두고(단위 테스트 대상) DOM 조작은 patterns.js가 한다.

export const SHEET = {
  maxWidth: 640,          // 바텀 시트 최대 폭(M3 · MDC · Compose SheetMaxWidth)
  wideMargin: 56,         // 창이 640보다 넓으면 위 · 양옆 여백 56(M3 Measurements)
  topMargin: 72,          // 좁은 창 위 여백
  peek: 56,               // 표준 시트 접힘 높이(Compose SheetPeekHeight)
  threshold: 56,          // 끌기 판정 거리(Compose PositionalThreshold)
  velocity: 125,          // 휙 밀기 판정 속도 px/s(Compose VelocityThreshold 125dp/s)
  sideWidth: 256,         // 사이드 시트 폭(MDC 토큰), 최대 400(M3)
  sideMaxWidth: 400,
  sideDetachedMargin: 16,
};

/**
 * 상태별 아래로 밀린 거리(px). height = 시트 높이, frame = 보이는 영역 높이.
 * expanded 0 · partial(모달 반만) · collapsed(표준, peek만 보임) · hidden(완전히 내려감).
 */
export function sheetOffset(state, height, frame) {
  if (state === 'expanded') return 0;
  if (state === 'partial') return Math.max(0, height - Math.round(frame / 2));
  if (state === 'collapsed') return Math.max(0, height - SHEET.peek);
  return height;
}

/**
 * 끌기를 놓았을 때 다음 상태 — 휙 밀었으면(속도) 그 방향, 아니면 임계(56) 넘게 아래로면 한 단계 내리고, 위로면 한 단계 올린다.
 * 모달: expanded ↔ partial → hidden(닫힘). 표준: expanded ↔ collapsed(숨지 않음).
 */
export function sheetSettle(type, state, dy, velocity = 0) {
  const order = type === 'modal' ? ['expanded', 'partial', 'hidden'] : ['expanded', 'collapsed'];
  const i = Math.max(0, order.indexOf(state));
  // 휙 밀기 — 놓는 순간 속도가 125 px/s를 넘으면 거리와 상관없이 그 방향으로 한 단계(Compose VelocityThreshold)
  if (velocity > SHEET.velocity) return order[Math.min(order.length - 1, i + 1)];
  if (velocity < -SHEET.velocity) return order[Math.max(0, i - 1)];
  if (dy > SHEET.threshold) return order[Math.min(order.length - 1, i + 1)];
  if (dy < -SHEET.threshold) return order[Math.max(0, i - 1)];
  return order[i];
}

/** 끌기 손잡이를 누르거나 Enter · Space — 펼침과 접힘(모달은 반만)을 번갈아(MDC 접근성: 손잡이 탭으로 상태 순환). */
export function sheetHandleNext(type, state) {
  if (type === 'modal') return state === 'expanded' ? 'partial' : 'expanded';
  return state === 'expanded' ? 'collapsed' : 'expanded';
}

/** 놓기 직전 속도(px/s) — 최근 100ms 안의 포인터 기록(시각 ms, y)으로 잰다. 기록이 모자라면 0. */
export function sheetVelocity(samples, window = 100) {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  const recent = samples.filter(s => last.t - s.t <= window);
  const first = recent.length >= 2 ? recent[0] : samples[samples.length - 2];
  const dt = last.t - first.t;
  return dt > 0 ? ((last.y - first.y) / dt) * 1000 : 0;
}
