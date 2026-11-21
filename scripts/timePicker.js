// Time pickers 로직 — 다이얼 각도 ↔ 값, 12/24시간 변환, 입력 칸 해석.
// 치수는 M3 Time pickers Specs · Compose TimePicker.kt: 다이얼 256, 바깥 고리 반지름 101, 안쪽 고리 69.

export const TIME_DIAL = { size: 256, outer: 101, inner: 69, handle: 48 };

/** 값이 가리키는 각도(12시 방향 0°, 시계 방향). mode: 'hour' | 'minute' */
export function dialAngle(value, mode) {
  return mode === 'minute' ? (value % 60) * 6 : (value % 12) * 30;
}

/**
 * 다이얼 위 점(중심 기준 x 오른쪽 +, y 아래 +)을 값으로. 시는 가장 가까운 시, 분은 가장 가까운 분.
 * 24시간 시 선택은 중심에서 두 고리 사이보다 가까우면 안쪽 고리(12–23), 아니면 바깥 고리(0–11).
 * 반환: 시 12시간제면 1–12, 24시간제면 0–23. 분 0–59.
 */
export function dialValueAt(x, y, mode, { is24h = false, dial = TIME_DIAL } = {}) {
  let deg = Math.atan2(x, -y) * 180 / Math.PI;
  if (deg < 0) deg += 360;
  if (mode === 'minute') return Math.round(deg / 6) % 60;
  const h = Math.round(deg / 30) % 12;
  if (!is24h) return h === 0 ? 12 : h;
  const inner = Math.hypot(x, y) < (dial.outer + dial.inner) / 2;
  return inner ? h + 12 : h;
}

/** 다이얼 숫자 위치(중심 기준). 24시간 안쪽 고리는 12–23. */
export function dialLabelPosition(value, mode, { is24h = false, dial = TIME_DIAL } = {}) {
  const angle = dialAngle(value, mode) * Math.PI / 180;
  const r = mode === 'hour' && is24h && value >= 12 ? dial.inner : dial.outer;
  const round = v => (Math.round(v * 100) / 100) + 0;
  return { x: round(Math.sin(angle) * r), y: round(-Math.cos(angle) * r), r };
}

/** 12시간 표시 → 24시간. hour12 1–12, period 'AM' | 'PM' */
export function to24Hour(hour12, period) {
  const h = hour12 % 12;
  return period === 'PM' ? h + 12 : h;
}

/** 24시간 → { hour12, period } */
export function from24Hour(hour24) {
  const h = ((hour24 % 24) + 24) % 24;
  return { hour12: h % 12 === 0 ? 12 : h % 12, period: h >= 12 ? 'PM' : 'AM' };
}

/** 입력 칸 해석. 시(12시간 1–12, 24시간 0–23) · 분(0–59). 숫자 1–2자리가 아니거나 범위 밖이면 null. */
export function parseTimeField(text, mode, { is24h = false } = {}) {
  const raw = String(text ?? '').trim();
  if (!/^\d{1,2}$/.test(raw)) return null;
  const n = Number(raw);
  if (mode === 'minute') return n <= 59 ? n : null;
  if (is24h) return n <= 23 ? n : null;
  return n >= 1 && n <= 12 ? n : null;
}

/** 두 자리 표시. */
export function pad2(n) { return String(n).padStart(2, '0'); }
