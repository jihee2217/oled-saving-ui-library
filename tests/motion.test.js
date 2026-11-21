import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SPRINGS, SPRING_SCHEMES, SPRING_SPEEDS, SPRING_CURVES, springValue, springDuration, springEasing,
         emphasizedEasing, emphasizedPoints, cssEasing, DURATIONS, EASING_PAIRS } from '../scripts/motion.js';

test('스프링 토큰 — 사이트 Standard 표 · Compose Expressive 값', () => {
  assert.deepEqual(SPRINGS.standard.fast.spatial, { stiffness: 1400, damping: 0.9 });
  assert.deepEqual(SPRINGS.standard.slow.effects, { stiffness: 800, damping: 1 });
  assert.deepEqual(SPRINGS.expressive.fast.spatial, { stiffness: 800, damping: 0.6 });
  assert.deepEqual(SPRINGS.expressive.default.spatial, { stiffness: 380, damping: 0.8 });
  assert.deepEqual(SPRING_CURVES.expressive.fast.spatial, [[0.42, 1.67, 0.21, 0.9], 350]);
});

test('스프링 해: 0에서 출발해 1로 정착, spatial은 넘치고(감쇠비 < 1) effects는 넘치지 않는다', () => {
  for (const scheme of SPRING_SCHEMES) {
    let previous = { spatial: 0, effects: 0 };
    for (const speed of SPRING_SPEEDS) {
      for (const type of ['spatial', 'effects']) {
        const spring = SPRINGS[scheme][speed][type];
        assert.equal(springValue(0, spring), 0);
        const d = springDuration(spring);
        assert.ok(Math.abs(1 - springValue(d / 1000, spring)) <= 0.001, `${scheme} ${speed} ${type}`);
        let peak = 0;
        for (let ms = 0; ms <= d; ms += 1) peak = Math.max(peak, springValue(ms / 1000, spring));
        if (type === 'spatial') assert.ok(peak > 1.001, `${scheme} ${speed} spatial overshoot`);
        else assert.ok(peak <= 1, `${scheme} ${speed} effects no overshoot`);
        // fast < default < slow
        assert.ok(d > previous[type], `${scheme} ${speed} ${type} 느려짐`);
        previous[type] = d;
      }
    }
  }
  // 사이트 곡선표(ms)와 같은 크기 차수
  assert.ok(Math.abs(springDuration(SPRINGS.standard.fast.effects) - 150) < 100);
});

test('linear() 변환 — 양 끝 0 · 1, 표본 수, 입력 % 증가', () => {
  const { easing, duration } = springEasing(SPRINGS.expressive.fast.spatial, 48);
  assert.ok(duration > 0);
  assert.match(easing, /^linear\(0, .* 1\)$/);
  const stops = easing.slice(7, -1).split(', ');
  assert.equal(stops.length, 49);
  const inputs = stops.slice(1, -1).map(s => parseFloat(s.split(' ')[1]));
  inputs.forEach((x, i) => assert.ok(i === 0 || x > inputs[i - 1]));
  assert.ok(stops.some(s => parseFloat(s) > 1), '넘침이 이징 값에 남는다');
});

test('Emphasized 경로 → linear(): 단조 증가 · 끝점 · 경로 위', () => {
  const pts = emphasizedPoints();
  pts.forEach(([x, y], i) => { if (i) { assert.ok(x >= pts[i - 1][0]); assert.ok(y >= pts[i - 1][1] - 1e-9); } });
  assert.deepEqual(pts[0], [0, 0]);
  assert.ok(Math.abs(pts.at(-1)[0] - 1) < 1e-9 && Math.abs(pts.at(-1)[1] - 1) < 1e-9);
  // 경로의 이음점 (0.166666, 0.4)이 표본에 들어 있다
  assert.ok(pts.some(([x, y]) => Math.abs(x - 0.166666) < 1e-6 && Math.abs(y - 0.4) < 1e-6));
  assert.match(emphasizedEasing(), /^linear\(0, .*, 1\)$/);
  assert.equal(cssEasing('standard'), 'cubic-bezier(0.2, 0, 0, 1)');
  assert.equal(cssEasing('emphasized'), emphasizedEasing());
});

test('지속 시간 16단계 · 추천 조합 6개 · tokens.css와 일치', async () => {
  assert.deepEqual(Object.values(DURATIONS).flat(), [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 700, 800, 900, 1000]);
  assert.equal(EASING_PAIRS.length, 6);
  const css = await readFile(new URL('../styles/tokens.css', import.meta.url), 'utf8');
  for (const [group, values] of Object.entries(DURATIONS)) {
    values.forEach((ms, i) => assert.ok(css.includes(`--md-duration-${group}${i + 1}: ${ms}ms;`), `${group}${i + 1}`));
  }
  assert.ok(css.includes(`--md-easing-emphasized: ${emphasizedEasing()};`), 'emphasized 토큰이 계산값과 같다');
  for (const name of ['legacy', 'legacy-decelerate', 'legacy-accelerate', 'linear', 'standard', 'standard-decelerate', 'standard-accelerate', 'emphasized-decelerate', 'emphasized-accelerate']) {
    assert.ok(css.includes(`--md-easing-${name}: ${cssEasing(name)};`), name);
  }
});
