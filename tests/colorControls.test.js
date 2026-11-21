import test from 'node:test';
import assert from 'node:assert/strict';
import { hslToRgb, rgbToHsl } from '../scripts/colorModel.js';
import { contrastBetween, findLightnessRange, findRgbChannelRange } from '../scripts/contrast.js';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';

test('RGB round trips preserve individual slider channels', () => {
  for (let r = 0; r <= 255; r += 17) {
    for (let g = 0; g <= 255; g += 17) {
      for (let b = 0; b <= 255; b += 17) {
        const hsl = rgbToHsl(r, g, b);
        assert.deepEqual(hslToRgb(hsl.h, hsl.s, hsl.l), { r, g, b });
      }
    }
  }
});

test('safe RGB channel endpoints are not incorrectly restricted', () => {
  assert.deepEqual(findRgbChannelRange('b', { r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }), { min: 0, max: 255 });
});

test('every permitted RGB value satisfies contrast, including separated safe intervals', () => {
  for (const ref of [0, 117, 128, 224, 255]) {
    const reference = { r: ref, g: ref, b: ref };
    for (const color of [{ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, { r: 20, g: 130, b: 80 }]) {
      for (const ch of ['r', 'g', 'b']) {
        const range = findRgbChannelRange(ch, color, reference);
        if (range.available === false) continue;
        for (let v = range.min; v <= range.max; v++) {
          assert.ok(contrastBetween({ ...color, [ch]: v }, reference) >= 4.5);
        }
      }
    }
  }
});

test('text lightness stays readable on both background and surface', () => {
  const refs = [{ r: 10, g: 10, b: 10 }, { r: 80, g: 80, b: 80 }];
  const { minL, maxL } = findLightnessRange(0, 0, refs, 4.5, hslToRgb, 88);
  for (let l = minL; l <= maxL; l += 0.1) {
    assert.ok(refs.every(ref => contrastBetween(hslToRgb(0, 0, l), ref) >= 4.5));
  }
});

test('the patterns workspace loads a classic script without a module loader', async () => {
  for (const [page, entry] of [['patterns', 'patterns']]) {
    const html = await readFile(new URL(`../${page}.html`, import.meta.url), 'utf8');
    assert.ok(html.includes(`defer src="scripts/${entry}.bundle.js`));
    assert.ok(!html.includes('type="module"'));
    const bundle = await readFile(new URL(`../scripts/${entry}.bundle.js`, import.meta.url), 'utf8');
    assert.doesNotThrow(() => new Script(bundle));
  }
});
