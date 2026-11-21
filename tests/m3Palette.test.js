import test from 'node:test';
import assert from 'node:assert/strict';
import { derivePaletteRoles, deriveSurfaceContainers, derivePrimaryOnBg, compositeOver, ROLE_ORDER, ROLE_GROUPS, lightnessForTone, toneOf,
         deriveNeutralsFromPrimary, neutralSaturationFor, surfaceToneDelta } from '../scripts/m3Palette.js';
import { PRESETS } from '../scripts/presets.js';
import { hslToRgb, rgbToHex, hexToRgb, rgbToHsl } from '../scripts/colorModel.js';
import { contrastBetween } from '../scripts/contrast.js';
import { calcBwIndex } from '../scripts/bwIndex.js';
import { AA_FLOOR } from '../scripts/gate.js';

const hex = t => { const { r, g, b } = hslToRgb(t.h, t.s, t.l); return rgbToHex(r, g, b); };
const ratio = (a, b) => contrastBetween(hslToRgb(a.h, a.s, a.l), hslToRgb(b.h, b.s, b.l));
const build = key => derivePaletteRoles(PRESETS[key].tokens, key);
const bwOf = t => { const { r, g, b } = hslToRgb(t.h, t.s, t.l); return calcBwIndex(r, g, b); };

test('M3 베이스라인 26개 역할을 모두 만든다', () => {
  assert.equal(ROLE_ORDER.length, 26);
  assert.equal(new Set(ROLE_ORDER).size, 26);
  // 그룹에 담긴 역할의 합이 전체와 같다.
  assert.deepEqual(ROLE_GROUPS.flatMap(g => g.roles).sort(), [...ROLE_ORDER].sort());
  for (const key of ['dark-saving', 'light-saving']) {
    const { roles } = build(key);
    for (const role of ROLE_ORDER) assert.ok(roles[role], `${key}: ${role} 누락`);
  }
});

test('톤 탐색이 목표 CIE L*를 0.25 안으로 맞춘다', () => {
  // 명도를 0.1 단위로 맞추므로 톤 오차의 하한이 있다. 그 한계 안인지를 본다.
  for (const [h, s] of [[10, 65], [3, 71], [210, 40], [0, 0]]) {
    for (const target of [10, 20, 30, 40, 50, 80, 90, 98]) {
      const l = lightnessForTone(h, s, target);
      assert.ok(Math.abs(toneOf({ h, s, l }) - target) < 0.25,
        `h${h} s${s} tone${target}: ${toneOf({ h, s, l }).toFixed(2)}`);
    }
  }
});

test('Error 계열은 브랜드 색과 무관하게 M3 베이스라인 값을 재현한다', () => {
  // M3 베이스라인: light error #B3261E, dark error #F2B8B5
  const expected = { 'light-saving': '#B3261E', 'dark-saving': '#F2B8B5' };
  for (const [key, target] of Object.entries(expected)) {
    const { roles } = build(key);
    const got = hexToRgb(hex(roles.error));
    const want = hexToRgb(target);
    for (const ch of ['r', 'g', 'b']) {
      assert.ok(Math.abs(got[ch] - want[ch]) <= 4,
        `${key} error ${hex(roles.error)} vs ${target} (${ch})`);
    }
  }
});

test('Error는 Primary 색상이 바뀌어도 따라가지 않는다', () => {
  const tokens = structuredClone(PRESETS['dark-saving'].tokens);
  const a = derivePaletteRoles(tokens, 'dark-saving').roles.error;
  tokens.accent = { ...tokens.accent, h: 210 };
  const b = derivePaletteRoles(tokens, 'dark-saving').roles.error;
  assert.deepEqual([a.h, a.s, a.l], [b.h, b.s, b.l]);
});

test('4토큰은 파생이 덮어쓰지 않고 그대로 정본이 된다', () => {
  for (const key of ['dark-saving', 'light-saving']) {
    const T = PRESETS[key].tokens;
    const { roles } = build(key);
    const same = (role, token) => {
      assert.equal(roles[role].source, 'token', `${role}은 토큰이어야 한다`);
      assert.deepEqual([roles[role].h, roles[role].s, roles[role].l], [token.h, token.s, token.l]);
    };
    same('primary', T.accent);
    same('background', T.bg);
    same('surface', T.surface);
    same('on-surface', T.text);
    same('on-background', T.text);
  }
});

test('Secondary·Tertiary는 M3의 색상·채도 관계를 따른다', () => {
  for (const key of ['dark-saving', 'light-saving']) {
    const T = PRESETS[key].tokens;
    const { roles } = build(key);
    // Secondary: 같은 색상, 채도는 16/48
    assert.equal(roles.secondary.h, T.accent.h);
    assert.ok(Math.abs(roles.secondary.s - T.accent.s / 3) < 0.11, `${key} secondary s=${roles.secondary.s}`);
    // Tertiary: 색상 +60°, 채도는 24/48
    assert.equal(roles.tertiary.h, (T.accent.h + 60) % 360);
    assert.ok(Math.abs(roles.tertiary.s - T.accent.s / 2) < 0.11, `${key} tertiary s=${roles.tertiary.s}`);
  }
});

test('모든 on- 역할이 짝 배경 위에서 본문 대비 4.5:1을 넘는다', () => {
  const pairs = {
    'on-primary': 'primary', 'on-primary-container': 'primary-container',
    'on-secondary': 'secondary', 'on-secondary-container': 'secondary-container',
    'on-tertiary': 'tertiary', 'on-tertiary-container': 'tertiary-container',
    'on-error': 'error', 'on-error-container': 'error-container',
    'on-background': 'background', 'on-surface': 'surface',
    'on-surface-variant': 'surface-variant', 'on-inverse-surface': 'inverse-surface',
  };
  for (const key of ['dark-saving', 'light-saving']) {
    const { roles } = build(key);
    for (const [on, bg] of Object.entries(pairs)) {
      const r = ratio(roles[on], roles[bg]);
      assert.ok(r >= AA_FLOOR.text - 0.01, `${key} ${on} on ${bg}: ${r.toFixed(2)}:1`);
      assert.ok(Math.abs(roles[on].contrast - r) < 0.02, `${key} ${on}: 기록된 대비가 실제와 다름`);
    }
  }
});

test('outline은 M3가 정한 비텍스트 대비 3:1을 표면에 대해 지킨다', () => {
  for (const key of ['dark-saving', 'light-saving']) {
    const { roles } = build(key);
    const r = ratio(roles.outline, roles.surface);
    assert.ok(r >= AA_FLOOR.nonText, `${key} outline on surface: ${r.toFixed(2)}:1`);
  }
});

test('입력 토큰을 변경하지 않는다', () => {
  const tokens = structuredClone(PRESETS['dark-saving'].tokens);
  const copy = structuredClone(tokens);
  derivePaletteRoles(tokens, 'dark-saving');
  assert.deepEqual(tokens, copy);
});

test('Primary를 바꾸면 Secondary·Tertiary가 따라 움직인다', () => {
  const tokens = structuredClone(PRESETS['dark-saving'].tokens);
  const before = derivePaletteRoles(tokens, 'dark-saving').roles;
  tokens.accent = { h: 210, s: 40, l: 66 };
  const after = derivePaletteRoles(tokens, 'dark-saving').roles;
  assert.notEqual(before.secondary.h, after.secondary.h);
  assert.equal(after.secondary.h, 210);
  assert.equal(after.tertiary.h, 270);
  // 중립 계열도 브랜드 색상을 따라간다(M3의 Neutral은 seed hue에 chroma 4).
  assert.equal(after['surface-variant'].h, 210);
});

test('중립 파생은 M3 규칙대로 색상·채도를 가져오고 표면 톤을 한 단계 옮긴다', () => {
  for (const key of ['dark-saving', 'light-saving']) {
    const T = PRESETS[key].tokens;
    const linked = deriveNeutralsFromPrimary(T, key);
    for (const role of ['bg', 'surface']) {
      // 색상은 Primary와 같고
      assert.equal(linked[role].h, T.accent.h, `${key} ${role} 색상`);
      // 채도는 M3의 Neutral chroma 4 / Primary chroma 48 비율이다.
      assert.ok(Math.abs(linked[role].s - T.accent.s / 12) < 0.06, `${key} ${role} 채도 ${linked[role].s}`);
    }
    // 배경 명도는 절감 판단의 기준선이라 도구가 옮기지 않는다.
    assert.equal(linked.bg.l, T.bg.l, `${key} bg 명도`);
    // 표면은 M3가 컨테이너를 배경에서 한 단계 옮기는 규칙을 따른다.
    // 밝은 모드는 배경보다 어둡게(-4), 어두운 모드는 밝게(+6).
    const delta = surfaceToneDelta(key);
    assert.equal(Math.sign(delta), key === 'light-saving' ? -1 : 1, `${key} 방향`);
    assert.ok(Math.abs(toneOf(linked.surface) - (toneOf(linked.bg) + delta)) < 0.25,
      `${key} surface 톤 ${toneOf(linked.surface)} vs ${toneOf(linked.bg) + delta}`);
    // 본문은 배경과 같은 규칙(Primary 색상 · 중립 채도)을 따르고 명도는 사용자 값 그대로다(명세 4.1.7). Primary는 손대지 않는다.
    assert.deepEqual(linked.text, { h: linked.bg.h, s: linked.bg.s, l: T.text.l });
    assert.deepEqual(linked.accent, T.accent);
  }
});

test('중립 파생이 절감을 되돌리지 않고 대비 기준을 지킨다', () => {
  for (const key of ['dark-saving', 'light-saving']) {
    const T = PRESETS[key].tokens;
    const linked = deriveNeutralsFromPrimary(T, key);
    // 배경은 명도를 건드리지 않으므로 BW가 사실상 그대로다(색상·채도 변화분만).
    assert.ok(Math.abs(bwOf(linked.bg) - bwOf(T.bg)) < 0.01, `${key} bg BW`);
    // 표면은 톤이 한 단계 움직이지만, 두 모드 모두 소비가 늘지 않는 방향이다.
    // 밝은 모드에서는 배경보다 어두워지고, 어두운 모드에서는 배경만큼 어두운 쪽에 머문다.
    assert.ok(bwOf(linked.surface) <= bwOf(T.surface) + 0.001,
      `${key} surface BW ${bwOf(T.surface).toFixed(4)} → ${bwOf(linked.surface).toFixed(4)}`);
    // 대비는 두 토큰 모두 본문 기준을 여유롭게 넘긴다.
    for (const role of ['bg', 'surface']) {
      assert.ok(ratio(T.text, linked[role]) >= AA_FLOOR.text,
        `${key} text/${role} ${ratio(T.text, linked[role]).toFixed(2)}`);
    }
    // 배경 대비는 눈에 띄게 달라지지 않는다.
    assert.ok(Math.abs(ratio(T.text, linked.bg) - ratio(T.text, T.bg)) < 0.3, `${key} text/bg 대비`);
  }
});

test('연동은 입력을 변경하지 않는다', () => {
  const tokens = structuredClone(PRESETS['dark-saving'].tokens);
  const copy = structuredClone(tokens);
  deriveNeutralsFromPrimary(tokens, 'dark-saving');
  assert.deepEqual(tokens, copy);
});

test('Primary 색상을 바꾸면 연동된 배경·표면도 따라간다', () => {
  const tokens = structuredClone(PRESETS['dark-saving'].tokens);
  tokens.accent = { h: 210, s: 60, l: 66 };
  const linked = deriveNeutralsFromPrimary(tokens, 'dark-saving');
  assert.equal(linked.bg.h, 210);
  assert.equal(linked.surface.h, 210);
  assert.equal(linked.bg.s, 5);
  assert.equal(neutralSaturationFor(tokens.accent), 5);
});

test('surface container 사다리는 M3 톤 순서를 따른다', () => {
  const light = deriveSurfaceContainers({ h: 10, s: 4, l: 97.5 }, 'light-saving');
  const dark = deriveSurfaceContainers({ h: 10, s: 4, l: 5 }, 'dark-saving');
  const order = ['surface-container-lowest', 'surface-container-low', 'surface-container', 'surface-container-high', 'surface-container-highest'];
  for (let i = 1; i < order.length; i += 1) {
    assert.ok(light[order[i]].tone < light[order[i - 1]].tone, `light ${order[i]}`);
    assert.ok(dark[order[i]].tone > dark[order[i - 1]].tone, `dark ${order[i]}`);
  }
});

test('글자용 Primary는 대비가 충분하면 그대로, 모자라면 명도만 옮겨 기준을 채운다', () => {
  const light = { h: 0, s: 1, l: 96 };
  const dark = { h: 0, s: 5, l: 4 };
  const orange = { h: 10, s: 65, l: 38 };
  const kept = derivePrimaryOnBg(orange, [light], 4.5);
  assert.equal(kept.lifted, false);
  assert.deepEqual(kept.color, orange);
  // 모드 전환 실측값: 밝은 모드 초록 L35.6(3.01:1), 어두운 모드로 옮긴 초록 L23.7(3.05:1)
  const cases = [[{ h: 140, s: 80, l: 35.6 }, light, 4.5], [{ h: 140, s: 80, l: 35.6 }, light, 7],
                 [{ h: 140, s: 80, l: 23.7 }, dark, 4.5], [{ h: 140, s: 80, l: 23.7 }, dark, 11]];
  for (const [green, bg, target] of cases) {
    const r = derivePrimaryOnBg(green, [bg], target);
    assert.equal(r.lifted, true);
    assert.equal(r.color.h, 140);
    assert.equal(r.color.s, 80);
    assert.ok(r.ratio >= target, `${target}:1 미달 ${r.ratio}`);
  }
});

test('카드 컨테이너·선택 덮개 위 본문(--text-on-container)은 대비 기준을 채운다', () => {
  const cases = [['dark-saving', { h: 8, s: 6, l: 4 }, { h: 8, s: 4, l: 51 }, { h: 10, s: 40, l: 80 }],
                 ['light-saving', { h: 8, s: 6, l: 96 }, { h: 8, s: 4, l: 41 }, { h: 10, s: 25, l: 40 }]];
  for (const [preset, bg, text, secondary] of cases) {
    const c = deriveSurfaceContainers(bg, preset);
    const anchors = [c['surface-container-low'], c['surface-container-highest'], bg].flatMap(base => [base, compositeOver(base, secondary, 0.16)]);
    for (const target of [4.5, 7]) {
      const r = derivePrimaryOnBg(text, anchors, target);
      assert.ok(r.ratio >= target, `${preset} ${target}: ${r.ratio}`);
    }
    // 11:1은 선택 덮개가 깔린 highest 위에서 도달 불가일 수 있다 → 가능한 최대 대비로 물러선다.
    const high = derivePrimaryOnBg(text, anchors, 11);
    const best = Math.max(...[0, 100].map(l => Math.min(...anchors.map(a => derivePrimaryOnBg({ ...text, l }, [a], 1).ratio))));
    assert.ok(high.ratio >= Math.min(11, best) - 0.05, `${preset} 11: ${high.ratio} / 최대 ${best}`);
  }
});

test('compositeOver는 덮는 색 쪽으로 섞는다', () => {
  const black = { h: 0, s: 0, l: 0 }, white = { h: 0, s: 0, l: 100 };
  assert.equal(compositeOver(black, white, 0).l, 0);
  assert.equal(compositeOver(black, white, 1).l, 100);
  assert.ok(Math.abs(compositeOver(black, white, 0.5).l - 50) <= 1);
});

test('on- 역할은 대비 단계 목표(4.5 · 7 · 11)를 따라 명도를 옮긴다', async () => {
  const { PRESETS } = await import('../scripts/presets.js');
  for (const key of ['dark-saving', 'light-saving']) {
    const standard = derivePaletteRoles(PRESETS[key].tokens, key).roles;
    for (const target of [4.5, 7, 11]) {
      const { roles } = derivePaletteRoles(PRESETS[key].tokens, key, target);
      for (const on of ['on-primary-container', 'on-secondary-container', 'on-tertiary-container', 'on-surface-variant', 'on-primary', 'on-error']) {
        const r = roles[on];
        // 목표를 채우거나, 못 채우면 끝 명도(0 · 100)까지 가 있어야 한다.
        assert.ok(r.contrast >= target - 0.01 || r.l === 0 || r.l === 100, `${key} ${target} ${on}: ${r.contrast} (L${r.l})`);
        // 명도는 기준을 채우는 가장 가까운 값이어서 표준보다 대비가 줄지 않는다.
        assert.ok(r.contrast >= standard[on].contrast - 0.01, `${key} ${target} ${on} 역행`);
      }
    }
    // 표준(4.5)은 기본 인자와 같다 — 기존 BW 수치가 바뀌지 않는다.
    const same = derivePaletteRoles(PRESETS[key].tokens, key, 4.5).roles;
    for (const role of Object.keys(same)) assert.equal(same[role].l, standard[role].l, role);
  }
});

test('on-만으로 모자라면 파생 컨테이너의 명도를 옮겨 목표를 채운다(색상·채도는 Primary 파생 그대로)', async () => {
  const { PRESETS } = await import('../scripts/presets.js');
  const pairs = [['on-primary-container', 'primary-container'], ['on-secondary-container', 'secondary-container'],
    ['on-tertiary-container', 'tertiary-container'], ['on-error-container', 'error-container'], ['on-surface-variant', 'surface-variant']];
  for (const key of ['dark-saving', 'light-saving']) {
    const standard = derivePaletteRoles(PRESETS[key].tokens, key).roles;
    for (const target of [7, 11]) {
      const { roles } = derivePaletteRoles(PRESETS[key].tokens, key, target);
      for (const [on, bg] of pairs) {
        assert.ok(roles[on].contrast >= target - 0.01, `${key} ${target} ${on}: ${roles[on].contrast}`);
        assert.equal(roles[bg].h, standard[bg].h);
        assert.equal(roles[bg].s, standard[bg].s);
      }
    }
  }
  // 표준 단계에서는 컨테이너가 옮겨지지 않는다.
  for (const key of ['dark-saving', 'light-saving']) {
    const { roles } = derivePaletteRoles(PRESETS[key].tokens, key);
    assert.ok(Object.values(roles).every(r => !r.shifted), key);
  }
});

test('on-surface-variant는 컨테이너 배경 묶음(선택 덮개 포함) 위 모두에서 대비 단계 기준을 채운다', async () => {
  const { PRESETS } = await import('../scripts/presets.js');
  const { containerTextAnchors } = await import('../scripts/m3Palette.js');
  for (const key of ['dark-saving', 'light-saving']) {
    const t = PRESETS[key].tokens;
    const standard = derivePaletteRoles(t, key).roles['on-surface-variant'];
    for (const target of [4.5, 7, 11]) {
      const { roles } = derivePaletteRoles(t, key, target);
      const anchors = containerTextAnchors(t.bg, t.surface, key, roles.secondary);
      const worst = Math.min(...anchors.map(a => derivePrimaryOnBg(roles['on-surface-variant'], [a], 1).ratio));
      assert.ok(worst >= target - 0.01 || [0, 100].includes(roles['on-surface-variant'].l), `${key} ${target}: ${worst}`);
    }
    if (key) assert.ok(standard.l >= 0);
  }
});

test('글자용 Primary는 surface-container 사다리(low · high · highest)에서도 기준을 채운다', async () => {
  const { primaryTextAnchors, deriveSurfaceContainers } = await import('../scripts/m3Palette.js');
  for (const [preset, bg, surface] of [['light-saving', { h: 30, s: 20, l: 96 }, { h: 30, s: 20, l: 92 }], ['dark-saving', { h: 30, s: 10, l: 6 }, { h: 30, s: 10, l: 12 }]]) {
    const anchors = primaryTextAnchors(bg, surface, preset);
    const c = deriveSurfaceContainers(bg, preset);
    assert.equal(anchors.length, 5);
    assert.deepEqual(anchors[3], c['surface-container-high']);
    for (const target of [4.5, 7]) {
      const r = derivePrimaryOnBg({ h: 10, s: 80, l: 45 }, anchors, target);
      assert.ok(Math.min(...anchors.map(a => derivePrimaryOnBg(r.color, [a], 1).ratio)) >= target - 0.01, `${preset} ${target}`);
    }
  }
});

test('텍스트 역할 4단 — 보조 글 · 반전 표면 · 반전 글자가 Text · Background 명도를 따라 옮겨진다(명세 4.1.7)', () => {
  for (const key of ['dark-saving', 'light-saving']) {
    const base = deriveNeutralsFromPrimary(PRESETS[key].tokens, key);
    const dark = key === 'dark-saving';
    const shifted = { ...base, text: { ...base.text, l: base.text.l + (dark ? -8 : 8) } };
    const a = derivePaletteRoles(base, key).roles;
    const b = derivePaletteRoles(shifted, key).roles;
    // 본문은 Text 토큰 그대로
    assert.equal(a['on-surface'].l, base.text.l);
    // 보조 글: Text 톤에서 M3 간격(+20 · −10)만큼, 대비가 되면 그대로
    if (!a['on-surface-variant'].lifted) assert.ok(Math.abs(a['on-surface-variant'].tone - (toneOf(base.text) + (dark ? -10 : 20))) < 0.6, `${key} variant 톤`);
    // Text 명도를 바꾸면 보조 글 · 반전 표면도 따라 바뀐다
    assert.notEqual(a['on-surface-variant'].l, b['on-surface-variant'].l, `${key} variant 추종`);
    if (!dark) assert.notEqual(a['inverse-surface'].l, b['inverse-surface'].l, `${key} inverse 추종`);
    // 색상은 모두 Primary 색상
    for (const r of ['on-surface', 'on-surface-variant', 'inverse-surface', 'on-inverse-surface']) assert.equal(a[r].h, base.accent.h, `${key} ${r} 색상`);
    // 반전 글자는 반전 표면 위 대비 기준을 지킨다
    assert.ok(a['on-inverse-surface'].contrast >= 4.49, `${key} inverse 대비 ${a['on-inverse-surface'].contrast}`);
  }
});
