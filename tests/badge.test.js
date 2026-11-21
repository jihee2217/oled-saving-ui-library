import test from 'node:test';
import assert from 'node:assert/strict';
import { formatBadgeCount, badgeAccessibleLabel, badgeTracking } from '../scripts/badge.js';

test('Badge 숫자는 999를 넘으면 999+ (최대 4자)', () => {
  assert.equal(formatBadgeCount(1), '1');
  assert.equal(formatBadgeCount(999), '999');
  assert.equal(formatBadgeCount(1000), '999+');
  assert.equal(formatBadgeCount(0), null);
  assert.equal(formatBadgeCount(-3), null);
  assert.equal(formatBadgeCount(true), '');
  assert.ok(formatBadgeCount(123456).length <= 4);
});

test('Badge 접근성 라벨은 목적지 이름 뒤에 읽힌다', () => {
  assert.equal(badgeAccessibleLabel('메일', 3), '메일, 새 알림 3개');
  assert.equal(badgeAccessibleLabel('메일', 1200), '메일, 새 알림 999개 이상');
  assert.equal(badgeAccessibleLabel('채팅', true), '채팅, 새 알림');
  assert.equal(badgeAccessibleLabel('홈', 0), '홈');
});

test('Large 배지는 34를 넘으면 자간을 줄여 34 안으로', () => {
  assert.equal(badgeTracking(30, 0.5, 4), null);
  assert.equal(badgeTracking(34, 0.5, 4), null);
  const t = badgeTracking(40.22, 0.5, 4);
  assert.ok(40.22 + (t - 0.5) * 4 <= 34, `자간 ${t}`);
  assert.equal(badgeTracking(80, 0.5, 4), -1.5);
});
