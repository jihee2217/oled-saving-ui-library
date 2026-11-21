import test from 'node:test';
import assert from 'node:assert/strict';
import { menuNextIndex, menuTypeahead, menuSelect, menuClosesOnSelect, menuPlacement } from '../scripts/menus.js';

test('메뉴 화살표 이동 — 감쌈, Home · End', () => {
  assert.equal(menuNextIndex(0, 4, 'ArrowDown'), 1);
  assert.equal(menuNextIndex(3, 4, 'ArrowDown'), 0);
  assert.equal(menuNextIndex(0, 4, 'ArrowUp'), 3);
  assert.equal(menuNextIndex(2, 4, 'Home'), 0);
  assert.equal(menuNextIndex(1, 4, 'End'), 3);
  assert.equal(menuNextIndex(1, 4, 'Tab'), 1);
  assert.equal(menuNextIndex(0, 0, 'ArrowDown'), -1);
});

test('글자로 이동 — 다음 항목부터 감싸며 찾는다', () => {
  const labels = ['잘라내기', '복사', '붙여넣기', 'Share', 'Settings'];
  assert.equal(menuTypeahead(labels, 0, '복'), 1);
  assert.equal(menuTypeahead(labels, 3, 's'), 4);
  assert.equal(menuTypeahead(labels, 4, 'S'), 3, '감싸서 처음부터');
  assert.equal(menuTypeahead(labels, 0, 'x'), -1);
  assert.equal(menuTypeahead(labels, 0, ' '), -1);
});

test('선택 — single은 하나만 · 닫음, multi는 뒤집기 · 열어 둠', () => {
  assert.deepEqual(menuSelect([true, false, false], 2, 'single'), [false, false, true]);
  assert.deepEqual(menuSelect([true, false, true], 0, 'multi'), [false, false, true]);
  assert.equal(menuClosesOnSelect('single'), true);
  assert.equal(menuClosesOnSelect('multi'), false);
});

test('배치 — 아래 · 시작 정렬, 모자라면 위 · 끝으로 뒤집는다, 하위 메뉴는 옆', () => {
  const viewport = { width: 1000, height: 800 };
  const menu = { width: 200, height: 240 };
  const b = menuPlacement({ left: 100, right: 140, top: 100, bottom: 140 }, menu, viewport);
  assert.deepEqual(b, { left: 100, top: 140, originX: 'left', originY: 'top' });
  const up = menuPlacement({ left: 100, right: 140, top: 600, bottom: 640 }, menu, viewport);
  assert.equal(up.top, 360, '아래가 모자라 위로');
  assert.equal(up.originY, 'bottom');
  const end = menuPlacement({ left: 900, right: 940, top: 100, bottom: 140 }, menu, viewport);
  assert.equal(end.left, 740, '끝이 넘쳐 끝 정렬');
  assert.equal(end.originX, 'right');
  const rtl = menuPlacement({ left: 500, right: 540, top: 100, bottom: 140 }, menu, viewport, { rtl: true });
  assert.equal(rtl.left, 340, 'RTL은 오른쪽 끝을 맞춘다');
  const side = menuPlacement({ left: 100, right: 300, top: 200, bottom: 244 }, menu, viewport, { kind: 'side' });
  assert.deepEqual([side.left, side.top, side.originX], [300, 200, 'left']);
  const sideFlip = menuPlacement({ left: 700, right: 900, top: 200, bottom: 244 }, menu, viewport, { kind: 'side' });
  assert.equal(sideFlip.left, 500, '오른쪽이 모자라면 왼쪽으로');
});

test('FAB 메뉴(웹) — 위로 4 띄우고 끝 정렬', () => {
  const viewport = { width: 800, height: 700 };
  const menu = { width: 200, height: 240 };
  const p = menuPlacement({ left: 600, right: 656, top: 600, bottom: 656 }, menu, viewport, { gap: 4, align: 'end', prefer: 'above' });
  assert.equal(p.top, 600 - 4 - 240);
  assert.equal(menuPlacement({ left: 600, right: 656, top: 300, bottom: 356 }, menu, viewport, { gap: 4, prefer: 'above' }).top, 300 - 4 - 240);   // 아래가 넓어도 위
  assert.equal(p.left, 656 - 200);
  assert.equal(p.originY, 'bottom');
});
