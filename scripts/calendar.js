// Local calendar dates avoid UTC/daylight-saving shifts in the displayed day.
export function calendarDate(year, month, day) {
  return new Date(year, month, day, 12);
}

export function shiftCalendarMonth(date, offset) {
  const first = calendarDate(date.getFullYear(), date.getMonth() + offset, 1);
  const last = calendarDate(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return calendarDate(first.getFullYear(), first.getMonth(), Math.min(date.getDate(), last));
}

export function calendarKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function calendarWeeks(date) {
  const year = date.getFullYear(), month = date.getMonth();
  const firstDay = calendarDate(year, month, 1).getDay();
  const lastDay = calendarDate(year, month + 1, 0).getDate();
  return Array.from({ length: Math.ceil((firstDay + lastDay) / 7) }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const day = week * 7 + weekday - firstDay + 1;
      return day > 0 && day <= lastDay ? calendarDate(year, month, day) : null;
    }));
}
