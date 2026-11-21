import test from 'node:test';
import assert from 'node:assert/strict';
import { TOOLTIP, tooltipPlace, tooltipHideDelay } from '../scripts/tooltip.js';

const bounds = { left: 0, top: 0, width: 400, height: 300 };
test('plain — 위 가운데 4, 자리 없으면 아래, below 옵션, 가장자리는 8 단위로 밀기', () => {
  const p = tooltipPlace('plain', { left: 180, top: 100, width: 40, height: 40 }, { width: 80, height: 24 }, bounds);
  assert.deepEqual(p, { left: 160, top: 72, side: 'top', align: 'center' });
  assert.equal(tooltipPlace('plain', { left: 180, top: 10, width: 40, height: 40 }, { width: 80, height: 24 }, bounds).side, 'bottom');
  assert.equal(tooltipPlace('plain', { left: 180, top: 100, width: 40, height: 40 }, { width: 80, height: 24 }, bounds, { below: true }).top, 144);
  const edge = tooltipPlace('plain', { left: 0, top: 100, width: 40, height: 40 }, { width: 120, height: 24 }, bounds);
  assert.equal(edge.left, TOOLTIP.margin);
});

test('rich — 오른쪽 아래, 넘치면 왼쪽 · 위', () => {
  const s = { width: 200, height: 120 };
  assert.deepEqual(tooltipPlace('rich', { left: 40, top: 40, width: 40, height: 40 }, s, bounds), { left: 80, top: 84, side: 'bottom', align: 'end' });
  const r = tooltipPlace('rich', { left: 300, top: 40, width: 40, height: 40 }, s, bounds);
  assert.equal(r.align, 'start'); assert.equal(r.left, 100);
  assert.equal(tooltipPlace('rich', { left: 40, top: 200, width: 40, height: 40 }, s, bounds).side, 'top');
});

test('닫힘 지연', () => {
  assert.equal(tooltipHideDelay('transient', 'leave'), 1500);
  assert.equal(tooltipHideDelay('transient', 'escape'), 0);
  assert.equal(tooltipHideDelay('persistent', 'leave'), Infinity);
  assert.equal(tooltipHideDelay('persistent', 'outside'), 0);
});
