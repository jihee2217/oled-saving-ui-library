/**
 * motion.js
 * Styles › Motion의 순수 계산 — M3 모션 물리 시스템(스프링)과 이징 · 지속 시간(레거시) 토큰.
 *
 * 출처: m3.material.io/styles/motion (Motion physics system › Specs, Easing and duration › Tokens & specs),
 * Compose Material3 tokens ExpressiveMotionTokens · StandardMotionTokens(v0_14_0) · MotionTokens(v0_103).
 *
 * 웹 변환: M3는 웹에서 "가능하면 스프링, 아니면 스프링을 흉내 낸 곡선"을 쓰라고 한다. 여기서는 스프링을
 * 감쇠 조화 진동 해석해로 풀어 CSS `linear()` 이징과 정착 시간으로 만든다(springEasing). 사이트의 곡선 변환표
 * (SPRING_CURVES)도 함께 둔다. Emphasized 이징은 두 구간 베지어 경로라 cubic-bezier()로 쓸 수 없어
 * 사이트가 "CSS N/A(Standard로 대체)"라고 적었는데, 경로를 표본화해 `linear()`로 옮긴다(emphasizedEasing).
 */

/** 스프링 토큰(질량 1, damping = 감쇠비). 사이트 표 = Standard 스킴, Expressive는 Compose ExpressiveMotionTokens. */
export const SPRINGS = {
  expressive: {
    fast:    { spatial: { stiffness: 800,  damping: 0.6 }, effects: { stiffness: 3800, damping: 1 } },
    default: { spatial: { stiffness: 380,  damping: 0.8 }, effects: { stiffness: 1600, damping: 1 } },
    slow:    { spatial: { stiffness: 200,  damping: 0.8 }, effects: { stiffness: 800,  damping: 1 } },
  },
  standard: {
    fast:    { spatial: { stiffness: 1400, damping: 0.9 }, effects: { stiffness: 3800, damping: 1 } },
    default: { spatial: { stiffness: 700,  damping: 0.9 }, effects: { stiffness: 1600, damping: 1 } },
    slow:    { spatial: { stiffness: 300,  damping: 0.9 }, effects: { stiffness: 800,  damping: 1 } },
  },
};
export const SPRING_SCHEMES = ['expressive', 'standard'];
export const SPRING_SPEEDS = ['fast', 'default', 'slow'];
export const SPRING_TYPES = ['spatial', 'effects'];

/** 사이트 "Web: Convert springs to curves" 표 그대로(cubic-bezier 네 값, ms). */
export const SPRING_CURVES = {
  expressive: {
    fast:    { spatial: [[0.42, 1.67, 0.21, 0.90], 350], effects: [[0.31, 0.94, 0.34, 1.00], 150] },
    default: { spatial: [[0.38, 1.21, 0.22, 1.00], 500], effects: [[0.34, 0.80, 0.34, 1.00], 200] },
    slow:    { spatial: [[0.39, 1.29, 0.35, 0.98], 650], effects: [[0.34, 0.88, 0.34, 1.00], 300] },
  },
  standard: {
    fast:    { spatial: [[0.27, 1.06, 0.18, 1.00], 350], effects: [[0.31, 0.94, 0.34, 1.00], 150] },
    default: { spatial: [[0.27, 1.06, 0.18, 1.00], 500], effects: [[0.34, 0.80, 0.34, 1.00], 200] },
    slow:    { spatial: [[0.27, 1.06, 0.18, 1.00], 750], effects: [[0.34, 0.88, 0.34, 1.00], 300] },
  },
};

/** 레거시 이징(사이트 Tokens & specs의 CSS 값 · Compose MotionTokens). emphasized는 경로라 별도. */
export const EASINGS = {
  'emphasized-decelerate': [0.05, 0.7, 0.1, 1],
  'emphasized-accelerate': [0.3, 0, 0.8, 0.15],
  standard: [0.2, 0, 0, 1],
  'standard-decelerate': [0, 0, 0, 1],
  'standard-accelerate': [0.3, 0, 1, 1],
  legacy: [0.4, 0, 0.2, 1],
  'legacy-decelerate': [0, 0, 0.2, 1],
  'legacy-accelerate': [0.4, 0, 1, 1],
  linear: [0, 0, 1, 1],
};

/** Emphasized 경로(Android pathInterpolator): M 0,0 C 0.05,0 0.133333,0.06 0.166666,0.4 C 0.208333,0.82 0.25,1 1,1 */
export const EMPHASIZED_PATH = [[[0, 0], [0.05, 0], [0.133333, 0.06], [0.166666, 0.4]], [[0.166666, 0.4], [0.208333, 0.82], [0.25, 1], [1, 1]]];

/** 지속 시간(ms). */
export const DURATIONS = {
  short: [50, 100, 150, 200],
  medium: [250, 300, 350, 400],
  long: [450, 500, 550, 600],
  'extra-long': [700, 800, 900, 1000],
};

/** 사이트 "Suggested easing and duration pairs". */
export const EASING_PAIRS = [
  { easing: 'emphasized', duration: 500, type: 'Begin and end on screen' },
  { easing: 'emphasized-decelerate', duration: 400, type: 'Enter the screen' },
  { easing: 'emphasized-accelerate', duration: 200, type: 'Exit the screen' },
  { easing: 'standard', duration: 300, type: 'Begin and end on screen' },
  { easing: 'standard-decelerate', duration: 250, type: 'Enter the screen' },
  { easing: 'standard-accelerate', duration: 200, type: 'Exit the screen' },
];

const round = (value, digits = 3) => Number(value.toFixed(digits));

/** 스프링 진행값 x(t) — 0에서 1로, 정지 상태 출발. t는 초. */
export function springValue(t, { stiffness, damping }) {
  const w0 = Math.sqrt(stiffness);
  if (damping < 1) {
    const wd = w0 * Math.sqrt(1 - damping * damping);
    const decay = Math.exp(-damping * w0 * t);
    return 1 - decay * (Math.cos(wd * t) + (damping * w0 / wd) * Math.sin(wd * t));
  }
  if (damping === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const r1 = -w0 * (damping - Math.sqrt(damping * damping - 1));
  const r2 = -w0 * (damping + Math.sqrt(damping * damping - 1));
  const c2 = r1 / (r2 - r1);
  const c1 = -1 - c2;
  return 1 + c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
}

/** 정착 시간(ms) — 이후로 목표에서 threshold 안에 머무는 첫 시각(1ms 격자). */
export function springDuration(spring, threshold = 0.001) {
  let settled = 0;
  for (let ms = 0; ms <= 5000; ms += 1) {
    if (Math.abs(1 - springValue(ms / 1000, spring)) > threshold) settled = ms + 1;
  }
  return settled;
}

/** 스프링 → CSS linear() 이징 + 지속 시간(ms). samples개 표본(균등 시간). */
export function springEasing(spring, samples = 48) {
  const duration = springDuration(spring);
  const points = [];
  for (let i = 0; i <= samples; i += 1) {
    const value = i === samples ? 1 : springValue((duration * i / samples) / 1000, spring);
    points.push(i === 0 ? '0' : i === samples ? '1' : `${round(value)} ${round(i / samples * 100, 1)}%`);
  }
  return { easing: `linear(${points.join(', ')})`, duration };
}

function bezierPoint(seg, u) {
  const m = 1 - u;
  const a = m * m * m, b = 3 * m * m * u, c = 3 * m * u * u, d = u * u * u;
  return [a * seg[0][0] + b * seg[1][0] + c * seg[2][0] + d * seg[3][0], a * seg[0][1] + b * seg[1][1] + c * seg[2][1] + d * seg[3][1]];
}

/** Emphasized 경로 표본(x 오름차순). */
export function emphasizedPoints(perSegment = 24) {
  const points = [];
  EMPHASIZED_PATH.forEach((seg, index) => {
    for (let i = index === 0 ? 0 : 1; i <= perSegment; i += 1) points.push(bezierPoint(seg, i / perSegment));
  });
  return points;
}

/** Emphasized → CSS linear(). */
export function emphasizedEasing(perSegment = 24) {
  const pts = emphasizedPoints(perSegment);
  return `linear(${pts.map(([x, y], i) => (i === 0 ? '0' : i === pts.length - 1 ? '1' : `${round(y)} ${round(x * 100, 2)}%`)).join(', ')})`;
}

/** 이징 이름 → CSS 값. */
export function cssEasing(name) {
  if (name === 'emphasized') return emphasizedEasing();
  const v = EASINGS[name];
  return v ? `cubic-bezier(${v.join(', ')})` : null;
}

/** 곡선 그림(SVG 경로, 0~1 영역을 w×h로, 위아래 여유 pad 비율). 스프링 · 경로 · 베지어 공용. */
export function curvePath(kind, value, { w = 96, h = 64, pad = 0.35, samples = 64 } = {}) {
  const yMin = -0.1, yMax = 1 + pad;
  const X = x => round(x * w, 1);
  const Y = y => round(h - ((y - yMin) / (yMax - yMin)) * h, 1);
  let pts;
  if (kind === 'spring') {
    const d = springDuration(value);
    pts = Array.from({ length: samples + 1 }, (_, i) => [i / samples, springValue((d * i / samples) / 1000, value)]);
  } else if (kind === 'path') {
    pts = emphasizedPoints();
  } else {
    const seg = [[0, 0], [value[0], value[1]], [value[2], value[3]], [1, 1]];
    pts = Array.from({ length: samples + 1 }, (_, i) => bezierPoint(seg, i / samples));
  }
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x)} ${Y(y)}`).join(' ');
}
