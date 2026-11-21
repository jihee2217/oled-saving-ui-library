import test from 'node:test';
import assert from 'node:assert/strict';
import { SHEET, sheetOffset, sheetSettle, sheetHandleNext, sheetVelocity } from '../scripts/sheets.js';

test('상태별 밀린 거리', () => {
  assert.equal(sheetOffset('expanded', 400, 520), 0);
  assert.equal(sheetOffset('partial', 400, 520), 140);
  assert.equal(sheetOffset('partial', 200, 520), 0, '반보다 낮은 시트는 다 보인다');
  assert.equal(sheetOffset('collapsed', 400, 520), 400 - SHEET.peek);
  assert.equal(sheetOffset('hidden', 400, 520), 400);
});

test('끌기 판정 — 임계 56', () => {
  assert.equal(sheetSettle('modal', 'expanded', 40), 'expanded');
  assert.equal(sheetSettle('modal', 'expanded', 80), 'partial');
  assert.equal(sheetSettle('modal', 'partial', 80), 'hidden');
  assert.equal(sheetSettle('modal', 'partial', -80), 'expanded');
  assert.equal(sheetSettle('standard', 'expanded', 200), 'collapsed');
  assert.equal(sheetSettle('standard', 'collapsed', 200), 'collapsed', '표준은 숨지 않음');
  assert.equal(sheetSettle('standard', 'collapsed', -60), 'expanded');
});

test('손잡이 — 펼침 ↔ 접힘', () => {
  assert.equal(sheetHandleNext('modal', 'expanded'), 'partial');
  assert.equal(sheetHandleNext('modal', 'partial'), 'expanded');
  assert.equal(sheetHandleNext('standard', 'expanded'), 'collapsed');
  assert.equal(sheetHandleNext('standard', 'collapsed'), 'expanded');
});

test('휙 밀기 — 속도 125 px/s 넘으면 짧게 끌어도 한 단계', () => {
  assert.equal(sheetSettle('modal', 'expanded', 20, 400), 'partial');
  assert.equal(sheetSettle('modal', 'partial', 10, 300), 'hidden');
  assert.equal(sheetSettle('modal', 'partial', -10, -300), 'expanded');
  assert.equal(sheetSettle('standard', 'collapsed', -15, -200), 'expanded');
  assert.equal(sheetSettle('modal', 'expanded', 20, 100), 'expanded', '느리고 짧으면 그대로');
  assert.equal(sheetSettle('modal', 'expanded', 80, -200), 'expanded', '위로 휙 밀면 거리보다 속도가 먼저');
});

test('놓기 직전 속도 — 최근 100ms 기록', () => {
  assert.equal(sheetVelocity([]), 0);
  assert.equal(sheetVelocity([{ t: 0, y: 0 }]), 0);
  assert.equal(sheetVelocity([{ t: 0, y: 0 }, { t: 400, y: 10 }, { t: 450, y: 30 }, { t: 500, y: 50 }]), 400);
  assert.equal(sheetVelocity([{ t: 0, y: 100 }, { t: 50, y: 80 }]), -400);
});
