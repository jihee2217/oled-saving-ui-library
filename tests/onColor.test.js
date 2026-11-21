import test from 'node:test';
import assert from 'node:assert/strict';
import { onColor, contrastBetween } from '../scripts/contrast.js';
import { hexToRgb } from '../scripts/colorModel.js';
test('primary foreground stays readable across the RGB cube', () => {
  for (let r = 0; r <= 255; r += 17) for (let g = 0; g <= 255; g += 17) for (let b = 0; b <= 255; b += 17) {
    const color = {r,g,b};
    assert.ok(contrastBetween(color, hexToRgb(onColor(color))) >= 4.5);
  }
});
