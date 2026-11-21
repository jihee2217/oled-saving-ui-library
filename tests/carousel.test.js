import test from 'node:test';
import assert from 'node:assert/strict';
import { CAROUSEL, carouselArrangement, carouselItemBox, carouselMaxPosition, carouselSlots } from '../scripts/carousel.js';

const fits = (a, width) => a.sizes.reduce((s, w) => s + w, 0) + CAROUSEL.gap * (a.sizes.length - 1) + CAROUSEL.padding * 2;

test('Carousel 배치는 컨테이너 폭(여백 16 · 간격 8 포함)을 정확히 채운다', () => {
  for (const [layout, pref] of [['multi-browse', 186], ['hero', 316], ['center-hero', 280]]) {
    for (const width of [360, 412, 720]) {
      const a = carouselArrangement(layout, width, pref);
      assert.ok(Math.abs(fits(a, width) - width) < 0.01, `${layout} ${width}: ${fits(a, width)}`);
      assert.ok(a.small >= 40 && a.small <= 56, `small ${a.small}`);
      assert.ok(a.large > a.small);
    }
  }
});

test('Multi-browse는 large · medium · small, medium = (large+small)/2', () => {
  const a = carouselArrangement('multi-browse', 412, 186);
  assert.deepEqual(a.sizes.length, 3);
  assert.ok(Math.abs(a.medium - (a.large + a.small) / 2) < 0.01);
  assert.equal(a.small, 56);
});

test('Hero는 large 뒤 small 하나, center-aligned hero는 small 사이에 large', () => {
  const h = carouselArrangement('hero', 412, 316);
  assert.equal(h.sizes.at(-1), h.small);
  const c = carouselArrangement('center-hero', 412, 280);
  assert.equal(c.sizes[0], c.small);
  assert.equal(c.sizes.at(-1), c.small);
  assert.equal(c.focalStart, 1);
});

test('스크롤 시작은 슬롯 그대로, 끝은 반전 배치(마지막 항목이 large)', () => {
  const a = carouselArrangement('multi-browse', 412, 186);
  const slots = carouselSlots(a.sizes);
  const n = 8;
  slots.forEach((slot, i) => assert.deepEqual(carouselItemBox(i, 0, a, 412, n), slot));
  const pMax = carouselMaxPosition(a, n);
  const last = carouselItemBox(n - 1, pMax, a, 412, n);
  assert.ok(Math.abs(last.w - a.large) < 0.01);
  assert.ok(Math.abs(last.x + last.w - (412 - CAROUSEL.padding)) < 0.01);
});

test('빠져나가는 항목은 컨테이너 바깥 앵커(폭 10)로 줄어든다', () => {
  const a = carouselArrangement('hero', 412, 316);
  const gone = carouselItemBox(0, 1, a, 412, 8);
  assert.deepEqual(gone, { x: -CAROUSEL.anchor, w: CAROUSEL.anchor });
  const half = carouselItemBox(0, 0.5, a, 412, 8);
  assert.ok(half.w < a.large && half.w > CAROUSEL.anchor);
});
