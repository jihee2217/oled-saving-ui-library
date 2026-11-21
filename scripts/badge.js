// Badge 값 규칙 — M3: 최대 4자("+" 포함), 숫자는 999를 넘으면 "999+" (MDC maxNumber 999 · maxCharacterCount 4)
export const BADGE_MAX_NUMBER = 999;

// true = small(점) 배지, 0 이하·false = 배지 없음, 숫자 = large 배지 글자
export function formatBadgeCount(value, max = BADGE_MAX_NUMBER) {
  if (value === true) return '';
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n > max ? `${max}+` : String(n);
}

// 배지는 목적지 이름 뒤에 읽힌다. 숫자 배지는 개수, 점 배지는 "새 알림".
export function badgeAccessibleLabel(label, value, max = BADGE_MAX_NUMBER) {
  if (value === true) return `${label}, 새 알림`;
  const text = formatBadgeCount(value, max);
  if (text === null) return label;
  return Number(value) > max ? `${label}, 새 알림 ${max}개 이상` : `${label}, 새 알림 ${text}개`;
}

// Large 배지 최대 폭(M3 16×34). 시스템 글꼴이 넓어 넘치면 자간만 줄여 맞춘다.
export const BADGE_MAX_WIDTH = 34;
export const BADGE_MIN_TRACKING = -1.5;

// width: 현재 폭(px), tracking: 현재 자간(px), chars: 글자 수 → 새 자간(px) 또는 null(조정 불필요)
export function badgeTracking(width, tracking, chars, max = BADGE_MAX_WIDTH, min = BADGE_MIN_TRACKING) {
  if (!(width > max) || !chars) return null;
  const need = Math.floor((tracking - (width - max) / chars) * 20) / 20;
  return Math.max(min, need);
}
