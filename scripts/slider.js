// Sliders 규칙 — M3 Sliders(Expressive), MDC slider tokens.xml · Compose SliderTokens · Slider.kt(손잡이 간격 6 · 안쪽 모서리 2).
// 순수 계산만 두고(단위 테스트 대상) DOM 그리기 · 조작은 patterns.js가 한다.

/** 크기별 치수 — 트랙 높이 · 손잡이 높이 · 트랙 바깥 모서리 · 안쪽 아이콘(M3 Measurements, M 손잡이는 사이트 52). */
export const SLIDER_SIZES = {
  xs: { track: 16, handle: 44, radius: 8, icon: 0 },
  s: { track: 24, handle: 44, radius: 8, icon: 0 },
  m: { track: 40, handle: 52, radius: 12, icon: 24 },
  l: { track: 56, handle: 68, radius: 16, icon: 24 },
  xl: { track: 96, handle: 108, radius: 28, icon: 32 },
};
export const SLIDER = { handleWidth: 4, pressedHandleWidth: 2, gap: 6, insideRadius: 2, stop: 4, stopSpace: 6, iconPad: 10 };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** 값을 단계에 맞춘다(소수 오차 없이). */
export function sliderSnap(value, { min = 0, max = 100, step = 1 } = {}) {
  const v = clamp(value, min, max);
  if (!step) return v;
  const n = Math.round((v - min) / step);
  return clamp(Number((min + n * step).toFixed(10)), min, max);
}

/** 값 ↔ 비율 */
export const sliderFraction = (value, min = 0, max = 100) => (max === min ? 0 : (value - min) / (max - min));

/** 손잡이 가운데 위치 — 길이 length 위에서 손잡이 반폭만큼 안쪽(Compose 손잡이 범위). */
export function sliderPos(fraction, length, handleWidth = SLIDER.handleWidth) {
  return handleWidth / 2 + clamp(fraction, 0, 1) * (length - handleWidth);
}

/** 포인터 위치 → 값(단계 맞춤). */
export function sliderValueAt(pos, length, opts = {}, handleWidth = SLIDER.handleWidth) {
  const { min = 0, max = 100 } = opts;
  const f = clamp((pos - handleWidth / 2) / Math.max(1, length - handleWidth), 0, 1);
  return sliderSnap(min + f * (max - min), opts);
}

/**
 * 트랙 조각 — 손잡이마다 양옆 (반폭 + 간격 6)을 비우고, 조각마다 활성 여부와 양 끝 모서리(바깥 = 크기 모서리, 손잡이 쪽 = 2)를 준다.
 * type: 'standard'(시작 → 손잡이 활성) · 'centered'(가운데 → 손잡이 활성) · 'range'(두 손잡이 사이 활성).
 */
export function sliderSegments({ length, positions, type = 'standard', radius = 8, handleWidths = [] }) {
  const cuts = positions.map((p, i) => ({ p, half: (handleWidths[i] ?? SLIDER.handleWidth) / 2 + SLIDER.gap }));
  const mid = length / 2;
  const isActive = (a, b) => {
    const c = (a + b) / 2;
    if (type === 'range') return c > positions[0] && c < positions[positions.length - 1];
    if (type === 'centered') return (c > mid && c < positions[0]) || (c < mid && c > positions[0]);
    return c < positions[0];
  };
  // 가운데형은 가운데에서 활성 · 비활성이 바뀐다(간격 없이)
  const points = [0];
  const edges = [radius];
  cuts.sort((x, y) => x.p - y.p).forEach(({ p, half }) => { points.push(p - half, p + half); edges.push(SLIDER.insideRadius, SLIDER.insideRadius); });
  points.push(length); edges.push(radius);
  const segs = [];
  for (let i = 0; i < points.length; i += 2) {
    let from = points[i], to = points[i + 1];
    if (to - from <= 0.5) continue;
    if (type === 'centered' && mid > from && mid < to) {
      segs.push({ from, to: mid, active: isActive(from, mid), r0: edges[i], r1: 0 });
      segs.push({ from: mid, to, active: isActive(mid, to), r0: 0, r1: edges[i + 1] });
      continue;
    }
    segs.push({ from, to, active: isActive(from, to), r0: edges[i], r1: edges[i + 1] });
  }
  return segs;
}

/**
 * 멈춤 점 — stops(단계 수)가 있으면 단계마다, 없으면 비활성 트랙 끝(끝에서 6 띄움)에만. 손잡이 간격 안의 점은 뺀다.
 * 반환: [{ pos, active }]
 */
export function sliderStops({ length, positions, type = 'standard', count = 0, handleWidth = SLIDER.handleWidth }) {
  const lo = SLIDER.stopSpace + SLIDER.stop / 2;
  const hi = length - lo;
  let list;
  if (count > 1) list = Array.from({ length: count }, (_, i) => clamp(sliderPos(i / (count - 1), length, handleWidth), lo, hi));
  else if (type === 'standard') list = [hi];
  else list = [lo, hi];
  const keep = p => positions.every(h => Math.abs(p - h) > handleWidth / 2 + SLIDER.gap + SLIDER.stop / 2);
  const segs = sliderSegments({ length, positions, type });
  const activeAt = p => segs.some(s => s.active && p >= s.from && p <= s.to);
  return list.filter(keep).map(pos => ({ pos, active: activeAt(pos) }));
}

/**
 * 키보드 — 오른쪽 · 위 +단계, 왼쪽 · 아래 −단계(RTL 가로는 좌우 반대), Page Up · Down ±10%(최소 한 단계), Home · End 끝.
 * 범위형은 lo · hi로 다른 손잡이를 넘지 못하게 한다.
 */
export function sliderKey(value, key, { min = 0, max = 100, step = 1, rtl = false, lo = min, hi = max } = {}) {
  const s = step || (max - min) / 100;
  const page = Math.max(s, Math.round(((max - min) / 10) / s) * s);
  const map = { ArrowUp: s, ArrowDown: -s, ArrowRight: rtl ? -s : s, ArrowLeft: rtl ? s : -s, PageUp: page, PageDown: -page };
  let next = value;
  if (key in map) next = value + map[key];
  else if (key === 'Home') next = min;
  else if (key === 'End') next = max;
  else return null;
  return clamp(sliderSnap(next, { min, max, step }), lo, hi);
}

/** 범위형에서 포인터에 가까운 손잡이 — 같으면 움직일 방향 쪽. */
export function sliderNearest(positions, pos) {
  let best = 0;
  positions.forEach((p, i) => { if (Math.abs(p - pos) < Math.abs(positions[best] - pos) || (Math.abs(p - pos) === Math.abs(positions[best] - pos) && pos > p)) best = i; });
  return best;
}
