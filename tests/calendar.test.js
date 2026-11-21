import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarDate, calendarKey, calendarWeeks, shiftCalendarMonth } from '../scripts/calendar.js';

test('month navigation clamps month-end dates including leap years', () => {
  assert.equal(calendarKey(shiftCalendarMonth(calendarDate(2024, 0, 31), 1)), '2024-02-29');
  assert.equal(calendarKey(shiftCalendarMonth(calendarDate(2025, 0, 31), 1)), '2025-02-28');
  assert.equal(calendarKey(shiftCalendarMonth(calendarDate(2026, 11, 31), 1)), '2027-01-31');
  assert.equal(calendarKey(shiftCalendarMonth(calendarDate(2026, 0, 31), -1)), '2025-12-31');
});

test('calendar grids place every date under the correct weekday exactly once', () => {
  for (const year of [2024, 2025, 2026]) for (let month = 0; month < 12; month++) {
    const weeks = calendarWeeks(calendarDate(year, month, 1));
    const dates = weeks.flat().filter(Boolean);
    assert.equal(dates.length, calendarDate(year, month + 1, 0).getDate());
    assert.equal(new Set(dates.map(calendarKey)).size, dates.length);
    weeks.forEach(week => {
      assert.equal(week.length, 7);
      week.forEach((date, weekday) => {
        if (date) { assert.equal(date.getDay(), weekday); assert.equal(date.getMonth(), month); }
      });
    });
  }
});

test('keyboard day offsets cross month and year boundaries', () => {
  assert.equal(calendarKey(calendarDate(2026, 8, 31)), '2026-10-01');
  assert.equal(calendarKey(calendarDate(2026, 0, 0)), '2025-12-31');
});
