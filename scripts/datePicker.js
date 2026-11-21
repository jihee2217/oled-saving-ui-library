// Date pickers 로직 — M3 Date pickers Accessibility(키보드 · 입력 형식)와 Guidelines(범위 선택)를 따른다.
// 달력 계산 기본(윤년 · 달 이동)은 calendar.js를 쓴다.
import { calendarDate, shiftCalendarMonth } from './calendar.js';

/** 두 날짜가 같은 날인지. */
export function sameDay(a, b) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** 날 단위 비교값(시각 무시). */
function dayValue(date) { return date.getFullYear() * 10000 + date.getMonth() * 100 + date.getDate(); }

/**
 * 키보드로 옮겨 갈 날짜(M3 Accessibility — Keyboard navigation).
 * 화살표 ±1일 · ±7일, Home/End 그 달 첫날 · 마지막 날, PageUp/PageDown 전후 달 같은 날,
 * Shift+PageUp/PageDown 전후 해 같은 날. 해당 키가 아니면 null. RTL이면 좌우 반전.
 */
export function datePickerKeyTarget(date, key, { shift = false, rtl = false } = {}) {
  const y = date.getFullYear(); const m = date.getMonth(); const d = date.getDate();
  const left = rtl ? 1 : -1;
  switch (key) {
    case 'ArrowLeft': return calendarDate(y, m, d + left);
    case 'ArrowRight': return calendarDate(y, m, d - left);
    case 'ArrowUp': return calendarDate(y, m, d - 7);
    case 'ArrowDown': return calendarDate(y, m, d + 7);
    case 'Home': return calendarDate(y, m, 1);
    case 'End': return calendarDate(y, m + 1, 0);
    case 'PageUp': return shiftCalendarMonth(date, shift ? -12 : -1);
    case 'PageDown': return shiftCalendarMonth(date, shift ? 12 : 1);
    default: return null;
  }
}

/**
 * 직접 입력한 날짜 해석(연·월·일 순서). M3: 입력 중에는 형식을 바꾸지 않고, 대시 · 공백 · 슬래시 · 점과
 * 한 자리 월·일(앞 0 생략)을 모두 받는다. 8자리 숫자(20260917)도 받는다. 없는 날짜면 null.
 */
export function parseDateInput(text) {
  const raw = String(text ?? '').trim();
  let parts;
  if (/^\d{8}$/.test(raw)) parts = [raw.slice(0, 4), raw.slice(4, 6), raw.slice(6, 8)];
  else parts = raw.split(/[\s./-]+/).filter(Boolean);
  if (parts.length !== 3 || !parts.every(p => /^\d+$/.test(p)) || parts[0].length !== 4) return null;
  const [y, m, d] = parts.map(Number);
  if (m < 1 || m > 12 || d < 1) return null;
  const date = calendarDate(y, m - 1, d);
  return date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

/** 입력 칸에 다시 써 줄 형식(입력을 마친 뒤에만 적용). YYYY/MM/DD */
export function formatDateInput(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

/**
 * 범위 선택 — 시작일이 없거나 이미 끝났으면 새 시작, 시작일보다 앞을 누르면 시작일을 옮기고,
 * 같거나 뒤를 누르면 끝일로 확정한다.
 */
export function nextRangeSelection({ start = null, end = null } = {}, clicked) {
  if (!start || end || dayValue(clicked) < dayValue(start)) return { start: clicked, end: null };
  return { start, end: clicked };
}

/** 범위 안(시작·끝 포함)인지. */
export function inDateRange(date, start, end) {
  if (!start || !end) return false;
  const v = dayValue(date);
  return v >= dayValue(start) && v <= dayValue(end);
}

/** 선택 가능한 범위 안인지(min · max 포함, 없으면 제한 없음). */
export function dateSelectable(date, min = null, max = null) {
  const v = dayValue(date);
  return (!min || v >= dayValue(min)) && (!max || v <= dayValue(max));
}

/** 연도 목록(오름차순). */
export function yearRange(from, to) {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
}
