// Loading indicator · Progress indicators 계산 — M3 Specs 토큰, Compose LoadingIndicator.kt · ProgressIndicator.kt ·
// WavyProgressIndicator.kt(2026-10-01 확인)를 옮겼다. 그리기(SVG)는 patterns.js가 한다. 단위는 px(= dp).

/* ─── Loading indicator ─── */
export const LOADING = {
  container: 48,          // 컨테이너 48 · 모양 38(Compose ActiveIndicatorScale = 38 / 48)
  active: 38,
  morphIntervalMs: 650,   // MorphIntervalMillis
  rotationMs: 4666,       // GlobalRotationDurationMillis
  damping: 0.6,           // spring(dampingRatio 0.6, stiffness 200, visibilityThreshold 0.1)
  stiffness: 200,
  threshold: 0.1,
};

/** 0 → 1 스프링(질량 1). Compose Animatable.animateTo(1f, spring(...))의 값 · 끝남. */
export function springStep(ms, { damping = LOADING.damping, stiffness = LOADING.stiffness, threshold = LOADING.threshold } = {}) {
  const t = Math.max(0, ms) / 1000;
  const w = Math.sqrt(stiffness);
  const wd = w * Math.sqrt(1 - damping * damping);
  const k = (damping * w) / wd;
  const env = Math.exp(-damping * w * t);
  const value = 1 - env * (Math.cos(wd * t) + k * Math.sin(wd * t));
  // 변위 포락선이 문턱 아래로 내려오면 끝(값 · 속도 모두 작아진 상태)
  const done = env * Math.sqrt(1 + k * k) < threshold;
  return { value, done };
}

/**
 * 불확정 로딩 표시의 한 장면 — 650ms마다 다음 모양으로 스프링 모핑하고, 끝나면 목표 회전이 90°씩 늘어난다.
 * 전체는 4666ms에 한 바퀴 등속 회전. count = 모양 수(7).
 */
export function loadingFrame(ms, count = 7) {
  const cycle = Math.floor(ms / LOADING.morphIntervalMs);
  const within = ms - cycle * LOADING.morphIntervalMs;
  const step = springStep(within);
  const finished = step.done;
  const index = (finished ? cycle + 1 : cycle) % count;
  const progress = finished ? 0 : step.value;
  const target = (90 * ((finished ? cycle + 2 : cycle + 1))) % 360;
  const global = ((ms % LOADING.rotationMs) / LOADING.rotationMs) * 360;
  return { index, progress, rotation: (progress * 90 + target + global) % 360 };
}

/** 확정 로딩 표시 — 원 → 부드러운 별 모핑, 진행할수록 반시계로 180°(Compose: rotate(-progress * 180)). */
export function loadingDeterminate(progress) {
  const p = Math.min(1, Math.max(0, progress));
  return { progress: p, rotation: -p * 180 };
}

/**
 * 맞춘 3차 곡선 쌍(시작 8 + 끝 8 값)을 progress로 보간해 SVG 경로로. Compose processPath처럼
 * size × scale로 키우고 경로 경계의 가운데를 상자 가운데에 맞춘다.
 */
export function morphPath(pairs, progress, size, scale) {
  const n = pairs.length;
  const pts = new Array(n);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i += 1) {
    const p = pairs[i];
    const c = new Array(8);
    for (let j = 0; j < 8; j += 1) {
      const v = (p[j] + (p[j + 8] - p[j]) * progress) * size * scale;
      c[j] = v;
      if (j % 2 === 0) { if (v < minX) minX = v; if (v > maxX) maxX = v; }
      else { if (v < minY) minY = v; if (v > maxY) maxY = v; }
    }
    pts[i] = c;
  }
  const dx = size / 2 - (minX + maxX) / 2;
  const dy = size / 2 - (minY + maxY) / 2;
  const f = v => Math.round(v * 100) / 100;
  let d = `M${f(pts[0][0] + dx)} ${f(pts[0][1] + dy)}`;
  for (const c of pts) d += `C${f(c[2] + dx)} ${f(c[3] + dy)} ${f(c[4] + dx)} ${f(c[5] + dy)} ${f(c[6] + dx)} ${f(c[7] + dy)}`;
  return `${d}Z`;
}

/* ─── Progress indicators ─── */
export const PROGRESS = {
  thickness: { default: 4, thick: 8 },                 // 활성 · 트랙 두께(Thick은 M3 견본 치수)
  linear: { gap: 4, stop: 4, amplitude: 3, wavelength: 40, indeterminateWavelength: 20, waveHeight: { default: 10, thick: 14 } },
  circular: { size: { default: 40, thick: 52 }, waveSize: 48, gap: 4, amplitude: 1.6, wavelength: 15 },
  // 불확정 선형 — 1750ms 주기, 두 줄의 머리 · 꼬리(지연 · 길이 ms), emphasized-accelerate
  linearCycle: 1750,
  lines: [[0, 1000], [250, 1000], [650, 850], [900, 850]],
  // 불확정 원형 — 6000ms 주기
  circularCycle: 6000,
  stopTrailingMax: 6,
};

/** 3차 베지어 이징(x1, y1, x2, y2). */
export function cubicBezier(x1, y1, x2, y2) {
  const bx = t => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3;
  const by = t => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
  return x => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 30; i += 1) { t = (lo + hi) / 2; if (bx(t) < x) lo = t; else hi = t; }
    return by(t);
  };
}
export const EASE = {
  standard: cubicBezier(0.2, 0, 0, 1),
  emphasizedAccelerate: cubicBezier(0.3, 0, 0.8, 0.15),
  emphasizedDecelerate: cubicBezier(0.05, 0.7, 0.1, 1),
};

/** 선형 확정 — 활성 [0, p], 트랙 [p + min(p, 간격), 1](둥근 끝이면 간격 + 두께), 끝 점. 값은 비율(0..1). */
export function linearDeterminate(progress, width, thickness, gap = PROGRESS.linear.gap) {
  const p = Math.min(1, Math.max(0, progress));
  const gapFraction = (gap + (thickness <= width ? thickness : 0)) / width;
  const trackStart = p + Math.min(p, gapFraction);
  return {
    active: p > 0 ? [0, p] : null,
    track: trackStart <= 1 ? [trackStart, 1] : null,
  };
}

/** 끝 점(stop indicator) — 지름 min(4, 두께), 끝에서 (두께 − 지름) / 2(최대 6) 안쪽. 반환: 중심 x(px) · 반지름. */
export function linearStop(width, thickness, stop = PROGRESS.linear.stop) {
  const size = Math.min(stop, thickness);
  const offset = Math.min((thickness - size) / 2, PROGRESS.stopTrailingMax);
  return { cx: width - size / 2 - offset, r: size / 2 };
}

/** 선 조각(비율)을 px 선분으로 — 둥근 끝이 바깥으로 나가지 않게 [두께/2, 폭 − 두께/2]로 자른다(Compose drawLinearIndicator). */
export function linearSegment([start, end], width, thickness) {
  const cap = thickness / 2;
  const clamp = v => Math.min(width - cap, Math.max(cap, v));
  return [clamp(Math.min(start, end) * width), clamp(Math.max(start, end) * width)];
}

/** 불확정 선형의 두 줄(머리 · 꼬리 비율). ms는 주기 안 시각. */
export function linearIndeterminate(ms) {
  const t = ((ms % PROGRESS.linearCycle) + PROGRESS.linearCycle) % PROGRESS.linearCycle;
  const at = ([delay, duration]) => EASE.emphasizedAccelerate(Math.min(1, Math.max(0, (t - delay) / duration)));
  const [h1, t1, h2, t2] = PROGRESS.lines.map(at);
  return { first: [h1, t1], second: [h2, t2] };
}

/** 불확정 선형의 조각들 — 줄 둘과 그 사이 트랙(Compose 그리는 순서 그대로). */
export function linearIndeterminateParts(ms, width, thickness, gap = PROGRESS.linear.gap) {
  const { first: [h1, t1], second: [h2, t2] } = linearIndeterminate(ms);
  const g = (gap + thickness) / width;
  const active = [];
  const track = [];
  if (h1 < 1 - g) track.push([h1 > 0 ? h1 + g : 0, 1]);
  if (h1 - t1 > 0) active.push([t1, h1]);
  if (t1 > g) track.push([h2 > 0 ? h2 + g : 0, t1 < 1 ? t1 - g : 1]);
  if (h2 - t2 > 0) active.push([t2, h2]);
  if (t2 > g) track.push([0, t2 < 1 ? t2 - g : 1]);
  return { active, track: track.filter(([a, b]) => b > a) };
}

/** 물결 진폭 비율 — 진행 10% 이하 · 95% 이상에서는 평평(Compose indicatorAmplitude). */
export function waveAmplitudeFor(progress) {
  return progress <= 0.1 || progress >= 0.95 ? 0 : 1;
}

/** 원형 확정 — 12시에서 시계 방향. 각도(도). 트랙은 활성 끝 + 간격부터 시작 − 간격까지. */
export function circularDeterminate(progress, size, thickness, gap = PROGRESS.circular.gap) {
  const p = Math.min(1, Math.max(0, progress));
  const sweep = p * 360;
  const gapSweep = ((gap + thickness) / (Math.PI * size)) * 360;
  const g = Math.min(sweep, gapSweep);
  return { start: -90, sweep, trackStart: -90 + sweep + g, trackSweep: 360 - sweep - g * 2 };
}

/** keyframes 보간 — [[ms, value, easing?]] (easing은 그 키프레임에서 시작하는 구간에 쓴다, Compose keyframes `using`). */
function keyframes(frames, ms) {
  for (let i = 0; i < frames.length - 1; i += 1) {
    const [t0, v0, ease] = frames[i];
    const [t1, v1] = frames[i + 1];
    if (ms <= t1) {
      const x = t1 === t0 ? 1 : (ms - t0) / (t1 - t0);
      return v0 + (v1 - v0) * (ease ? ease(x) : x);
    }
  }
  return frames[frames.length - 1][1];
}

/** 불확정 원형 — 전체 회전 6초에 1080°, 추가 회전 1.5초마다 90°(300ms), 길이 10% ↔ 87%. */
export function circularIndeterminate(ms) {
  const T = PROGRESS.circularCycle;
  const t = ((ms % T) + T) % T;
  const global = (t / T) * 1080;
  // Compose keyframes의 `using`은 그 키프레임에서 시작하는 구간에 걸린다. 추가 회전은 이징이 정지 구간(300 → 1500 등)에 걸려
  // 실제 90° 이동은 선형이다 — 원본 동작 그대로 옮긴다.
  const extra = keyframes([[0, 0], [300, 90], [1500, 90], [1800, 180], [3000, 180], [3300, 270], [4500, 270], [4800, 360], [6000, 360]], t);
  const sweep = keyframes([[0, 0.1], [3000, 0.87, EASE.standard], [6000, 0.1]], t) * 360;
  return { rotation: (global + extra) % 360, sweep };
}

/** 원형 물결 개수 — 둘레 / 파장을 반올림(파장이 크기에 비례해 모양이 같게 유지된다). */
export function circularWaveCount(radius, wavelength = PROGRESS.circular.wavelength) {
  return Math.max(1, Math.round((2 * Math.PI * radius) / wavelength));
}
