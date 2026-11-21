import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarDate, calendarKey } from '../scripts/calendar.js';
import { datePickerKeyTarget, parseDateInput, formatDateInput, nextRangeSelection, inDateRange, dateSelectable, yearRange, sameDay } from '../scripts/datePicker.js';
import { dialValueAt, dialAngle, dialLabelPosition, to24Hour, from24Hour, parseTimeField, pad2 } from '../scripts/timePicker.js';

const key = d => calendarKey(d);

test('날짜 키보드 — 화살표 · Home/End(달 첫날·끝날) · PageUp/Down(달) · Shift+Page(해) · RTL', () => {
  const d = calendarDate(2026, 8, 17);
  assert.equal(key(datePickerKeyTarget(d, 'ArrowRight')), '2026-09-18');
  assert.equal(key(datePickerKeyTarget(d, 'ArrowRight', { rtl: true })), '2026-09-16');
  assert.equal(key(datePickerKeyTarget(d, 'ArrowUp')), '2026-09-10');
  assert.equal(key(datePickerKeyTarget(d, 'Home')), '2026-09-01');
  assert.equal(key(datePickerKeyTarget(d, 'End')), '2026-09-30');
  assert.equal(key(datePickerKeyTarget(calendarDate(2026, 0, 31), 'PageDown')), '2026-02-28');
  assert.equal(key(datePickerKeyTarget(calendarDate(2024, 1, 29), 'PageDown', { shift: true })), '2025-02-28');
  assert.equal(datePickerKeyTarget(d, 'a'), null);
});

test('날짜 입력 — 구분자 여러 가지 · 앞 0 생략 · 8자리 · 없는 날짜 거부', () => {
  for (const t of ['2026/09/17', '2026-9-17', '2026.9.17', '2026 09 17', ' 2026. 9. 17 ', '20260917']) {
    assert.equal(key(parseDateInput(t)), '2026-09-17', t);
  }
  assert.equal(parseDateInput('2026/02/30'), null);
  assert.equal(parseDateInput('26/09/17'), null);
  assert.equal(parseDateInput('2026/13/01'), null);
  assert.equal(key(parseDateInput('2024-2-29')), '2024-02-29');
  assert.equal(formatDateInput(calendarDate(2026, 8, 7)), '2026/09/07');
});

test('범위 선택 — 시작 → 끝, 앞을 누르면 시작 이동, 끝난 뒤 누르면 새 시작', () => {
  const a = calendarDate(2026, 7, 17), b = calendarDate(2026, 7, 23), c = calendarDate(2026, 7, 10);
  let s = nextRangeSelection({}, a);
  assert.ok(sameDay(s.start, a) && s.end === null);
  s = nextRangeSelection(s, c);
  assert.ok(sameDay(s.start, c) && s.end === null);
  s = nextRangeSelection(s, b);
  assert.ok(sameDay(s.start, c) && sameDay(s.end, b));
  assert.ok(inDateRange(a, s.start, s.end));
  assert.ok(!inDateRange(calendarDate(2026, 7, 24), s.start, s.end));
  s = nextRangeSelection(s, a);
  assert.ok(sameDay(s.start, a) && s.end === null);
});

test('선택 가능 범위와 연도 목록', () => {
  assert.ok(dateSelectable(calendarDate(2026, 0, 1), calendarDate(2026, 0, 1), calendarDate(2026, 11, 31)));
  assert.ok(!dateSelectable(calendarDate(2025, 11, 31), calendarDate(2026, 0, 1)));
  assert.deepEqual(yearRange(2024, 2026), [2024, 2025, 2026]);
});

test('다이얼 — 각도 → 값(12h · 24h 안쪽 고리 · 분)', () => {
  assert.equal(dialValueAt(0, -100, 'hour'), 12);
  assert.equal(dialValueAt(100, 0, 'hour'), 3);
  assert.equal(dialValueAt(0, 100, 'hour', { is24h: true }), 6);
  assert.equal(dialValueAt(0, 60, 'hour', { is24h: true }), 18);
  assert.equal(dialValueAt(0, -60, 'hour', { is24h: true }), 12);
  assert.equal(dialValueAt(0, -100, 'hour', { is24h: true }), 0);
  assert.equal(dialValueAt(-100, 0, 'minute'), 45);
  assert.equal(dialValueAt(Math.sin(7 * 6 * Math.PI / 180) * 90, -Math.cos(7 * 6 * Math.PI / 180) * 90, 'minute'), 7);
  assert.equal(dialAngle(3, 'hour'), 90);
  assert.equal(dialAngle(15, 'hour'), 90);
  assert.deepEqual(dialLabelPosition(3, 'hour'), { x: 101, y: 0, r: 101 });
  assert.equal(dialLabelPosition(15, 'hour', { is24h: true }).r, 69);
});

test('12/24시간 변환과 입력 칸 해석', () => {
  assert.equal(to24Hour(12, 'AM'), 0);
  assert.equal(to24Hour(12, 'PM'), 12);
  assert.equal(to24Hour(7, 'PM'), 19);
  assert.deepEqual(from24Hour(0), { hour12: 12, period: 'AM' });
  assert.deepEqual(from24Hour(19), { hour12: 7, period: 'PM' });
  assert.equal(parseTimeField('07', 'hour'), 7);
  assert.equal(parseTimeField('0', 'hour'), null);
  assert.equal(parseTimeField('0', 'hour', { is24h: true }), 0);
  assert.equal(parseTimeField('24', 'hour', { is24h: true }), null);
  assert.equal(parseTimeField('59', 'minute'), 59);
  assert.equal(parseTimeField('60', 'minute'), null);
  assert.equal(parseTimeField('ab', 'minute'), null);
  assert.equal(pad2(5), '05');
});
