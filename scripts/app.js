/**
 * app.js
 * 메인 앱 로직 — 이벤트 ↔ 계산 ↔ DOM 연결
 * PRD FR-1~FR-7
 */

import { calcBwIndex } from './bwIndex.js';
import { contrastBetween, passesWCAG_AA, findLightnessRange, onColor } from './contrast.js';
import { hslToRgb, rgbToHsl, hexToRgb, rgbToHex } from './colorModel.js';
import { PRESETS, TOKEN_META } from './presets.js';
import { STATE_KEY, parseSettings, defaultDrafts, PRESET_KEYS } from './sharedState.js';
import { linkedAccent } from './primaryLink.js';
import { hctFromRgb, formatHct } from './hct.js';
import { CONTRAST_LEVELS, DEFAULT_CONTRAST_LEVEL, contrastTargets, contrastHeadroom } from './contrastLevels.js';
import { downloadFigmaTokens } from './figmaTokens.js';
import { schemeCssVars, levelTokens } from './scheme.js';
import { derivePalette, projectPalette, floorsForLevel, GATE_REFS, TOKEN_ORDER } from './gate.js';
import { derivePaletteRoles, ROLE_GROUPS, deriveNeutralsFromPrimary, deriveSurfaceContainers, derivePrimaryOnBg, containerTextAnchors, primaryTextAnchors, neutralSaturationFor, surfaceToneDelta, deriveTonalPalettes, deriveStaticColorRoles } from './m3Palette.js';

/* ════════════════════════════════════════
   앱 상태
   ════════════════════════════════════════ */

const state = {
  preset: 'dark-saving',
  tokens: {
    bg:      { h: 0,   s: 0,  l: 4  },
    surface: { h: 0,   s: 0,  l: 11 },
    text:    { h: 0,   s: 0,  l: 88 },
    accent:  { h: 10, s: 65, l: 66 },
  },
  mode: 'hsl', // 'hsl' | 'rgb'
  contrastLevel: DEFAULT_CONTRAST_LEVEL, // 'standard' | 'medium' | 'high'
  // 사용자가 슬라이더로 고른 명도. 게이트가 밀어 올린 값과 구분해 따로 들고 있어야
  // 대비 수준을 낮췄을 때 원래 고른 색으로 돌아오고, 세 단계를 같은 출발점에서 비교할 수 있다.
  intent: { bg: 4, surface: 11, text: 88, accent: 66 },
  // 모드별 작업본. 프리셋 토글은 이제 값을 버리지 않고 이 보관함을 오간다.
  // 초기화는 리셋 버튼으로만 일어난다.
  drafts: defaultDrafts(),
};

const clone = value => JSON.parse(JSON.stringify(value));

function sameColor(a, b) {
  return !!a && !!b && a.h === b.h && a.s === b.s && a.l === b.l;
}

/**
 * 지금 모드의 편집을 보관함에 넣는다.
 * Primary가 바뀌었다면 상대 모드에도 같은 색을 심는다(색상·채도는 그대로,
 * 명도는 그 모드 배경에서 같은 대비가 나오도록 다시 푼다 — primaryLink.js).
 */
function stashDraft() {
  const previous = state.drafts[state.preset];
  const accentMoved = !sameColor(previous?.tokens?.accent, state.tokens.accent);
  state.drafts[state.preset] = { tokens: clone(state.tokens), intent: { ...state.intent } };
  if (accentMoved) sharePrimary();
}

/** 보관함에서 한 모드를 꺼내 화면 상태로 올린다. */
function loadDraft(key) {
  const draft = state.drafts[key];
  if (!draft) return;
  state.tokens = clone(draft.tokens);
  state.intent = { ...draft.intent };
}

/** 지금 모드의 Primary를 나머지 모드로 옮긴다. */
function sharePrimary() {
  const source = state.drafts[state.preset];
  for (const key of PRESET_KEYS) {
    if (key === state.preset) continue;
    const target = state.drafts[key];
    if (!target) continue;
    const { accent } = linkedAccent(source.tokens.accent, source.tokens.bg, target.tokens.bg, target.tokens.accent);
    target.tokens.accent = accent;
    target.intent.accent = accent.l;
  }
}

/* ════════════════════════════════════════
   사용자 선호 (Media Queries 5)
   기준서 TKN-04 / TKN-06 — 접근성 요구가 절감 목표보다 우선한다.
   ════════════════════════════════════════ */

const prefersDarkQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
const prefersMoreContrastQuery = window.matchMedia?.('(prefers-contrast: more)');

/** 기기가 고대비를 선호하면 선택값과 무관하게 '높음'을 적용한다(TKN-06). */
function effectiveContrastLevel() {
  return prefersMoreContrastQuery?.matches ? 'high' : state.contrastLevel;
}

function effectiveTargets() {
  return contrastTargets(effectiveContrastLevel());
}

/* ════════════════════════════════════════
   DOM 참조
   ════════════════════════════════════════ */

const calcPanel   = document.getElementById('floating-calc');

/* ════════════════════════════════════════
   드래그 핸들 (플로팅 패널 — 마우스 + 터치 지원)
   ════════════════════════════════════════ */

(function initDrag() {
  const header = document.getElementById('calc-header');
  if (!header || !calcPanel) return;
  // 사이드바에 붙은 계산기는 끌어 옮기지 않는다(셸 레이아웃, 2026-09-28).
  if (calcPanel.closest('.pl-side-calc')) return;
  let dragging = false, startX, startY, origX, origY;

  function onStart(clientX, clientY) {
    dragging = true;
    const rect = calcPanel.getBoundingClientRect();
    startX = clientX; startY = clientY;
    origX  = rect.left; origY  = rect.top;

    // 위치 점프 방지: left/top을 현재 좌표로 고정한 후 right/bottom 해제
    calcPanel.style.left = origX + 'px';
    calcPanel.style.top  = origY + 'px';
    calcPanel.style.right = 'auto';
    calcPanel.style.bottom = 'auto';
    calcPanel.classList.add('is-dragging');
  }

  function onMove(clientX, clientY) {
    if (!dragging) return;
    const dx = clientX - startX;
    const dy = clientY - startY;
    const newX = Math.max(0, Math.min(window.innerWidth  - calcPanel.offsetWidth,  origX + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - calcPanel.offsetHeight, origY + dy));
    calcPanel.style.left = newX + 'px';
    calcPanel.style.top  = newY + 'px';
  }

  function onEnd() {
    if (!dragging) return;
    dragging = false;
    calcPanel.classList.remove('is-dragging');
  }

  // 마우스 이벤트
  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('.preset-btn, .calc-icon-btn')) return;
    onStart(e.clientX, e.clientY);
    const mouseMove = (ev) => onMove(ev.clientX, ev.clientY);
    const mouseUp = () => {
      onEnd();
      document.removeEventListener('mousemove', mouseMove);
      document.removeEventListener('mouseup', mouseUp);
    };
    document.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseup', mouseUp);
  });

  // 터치 이벤트
  header.addEventListener('touchstart', (e) => {
    if (e.target.closest('.preset-btn, .calc-icon-btn')) return;
    const t = e.touches[0];
    onStart(t.clientX, t.clientY);
    const touchMove = (ev) => {
      const touch = ev.touches[0];
      onMove(touch.clientX, touch.clientY);
    };
    const touchEnd = () => {
      onEnd();
      document.removeEventListener('touchmove', touchMove);
      document.removeEventListener('touchend', touchEnd);
    };
    document.addEventListener('touchmove', touchMove, { passive: true });
    document.addEventListener('touchend', touchEnd);
  }, { passive: true });
})();

/* ════════════════════════════════════════
   프리셋 선택
   ════════════════════════════════════════ */

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.preset;
    applyPreset(key);
  });
});

export function applyPreset(key) {
  if (!PRESETS[key] || key === state.preset) return;
  // 떠나는 모드의 편집을 먼저 보관하고, 가려는 모드의 편집을 꺼내 온다.
  stashDraft();
  state.preset = key;
  loadDraft(key);

  // 프리셋 버튼 활성화
  document.querySelectorAll('.preset-btn').forEach(b => {
    const on = b.dataset.preset === key;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });

  // data-style 속성 업데이트
  document.documentElement.dataset.style = key;

  // 모드마다 저장된 본문 밝기가 달라도 현재 선택한 대비 목표에 맞춘다.
  applyContrastLevel(state.contrastLevel);

  // 프리셋을 새로 고르면 직전 대비 수준 안내는 더 이상 맞지 않는다.
  const resultEl = document.getElementById('contrast-level-result');
  if (resultEl) resultEl.textContent = '';
}

/* ════════════════════════════════════════
   토큰 섹션 접기/펼치기
   ════════════════════════════════════════ */

document.querySelectorAll('.token-header').forEach(header => {
  header.addEventListener('click', () => {
    const section = header.closest('.token-section');
    section.classList.toggle('open');
    const isOpen = section.classList.contains('open');
    header.setAttribute('aria-expanded', isOpen);
  });
});

/* ════════════════════════════════════════
   모드 전환 (HSL / RGB)
   ════════════════════════════════════════ */

/* ════════════════════════════════════════
   슬라이더 / 피커 이벤트 바인딩
   ════════════════════════════════════════ */

['bg', 'text', 'accent'].forEach(tokenKey => {
  const section = document.querySelector(`.token-section[data-token="${tokenKey}"]`);
  if (!section) return;

  // 파생 토큰(Background의 색상·채도, Surface 전체)은 컨트롤 자체가 없다.
  // 있는 컨트롤만 묶어야 하므로 아래 모든 바인딩은 존재 여부를 먼저 확인한다.
  const colorPicker = section.querySelector('.hue-slider');
  const dropperButton = section.querySelector('.eyedropper-btn');
  const message = section.querySelector('.picker-message');
  function applyHueSaturation(h, s) {
    const previousL = state.tokens[tokenKey].l;
    // 색상·채도만 바뀐다. 명도 의도값은 그대로 두고 게이트가 다시 판단하게 한다.
    state.tokens[tokenKey] = { h, s, l: state.intent[tokenKey] };
    recalcWcagCaps();
    refreshAllTokenUI();
    updateAll();
    scheduleLevelCompare();   // 색상 · 채도가 바뀌어도 수준별 미달(빨간 점)을 다시 판단한다
    if (message) {
      message.textContent = Math.abs(state.tokens[tokenKey].l - previousL) > 0.001
        ? '대비 기준을 유지하기 위해 명도를 안전 범위로 조정했습니다.' : '';
    }
  }
  function applyPickedColor(value) {
    const rgb = hexToRgb(value);
    const { h, s } = rgbToHsl(rgb.r, rgb.g, rgb.b);
    applyHueSaturation(h, s);
  }
  if (colorPicker) {
    colorPicker.addEventListener('input', () => {
      applyHueSaturation(Number(colorPicker.value), state.tokens[tokenKey].s);
    });
  }
  const saturationSlider = section.querySelector('.slider-s');
  if (saturationSlider) {
    saturationSlider.addEventListener('input', () => {
      applyHueSaturation(state.tokens[tokenKey].h, Number(saturationSlider.value));
    });
  }
  if (dropperButton && typeof window.EyeDropper === 'function') {
    dropperButton.addEventListener('click', async () => {
      try {
        const result = await new window.EyeDropper().open();
        applyPickedColor(result.sRGBHex);
      } catch (error) {
        if (error.name !== 'AbortError' && message) {
          message.textContent = '색상을 가져오지 못했습니다. 팔레트에서 선택해주세요.';
        }
      }
    });
  } else if (dropperButton) {
    // 스포이드가 없는 브라우저에서는 버튼을 남기지 않고 지운다.
    // 누를 수 없는 버튼을 두는 것보다 없는 편이 낫다(이 패널의 원칙).
    dropperButton.remove();
    if (message) message.textContent = '화면 스포이드 미지원 · 팔레트에서 색상을 선택해주세요.';
  }

  // HSL: Lightness 슬라이더
  const lSlider = section.querySelector('.slider-l');
  if (lSlider) {
    lSlider.addEventListener('input', () => {
      // 슬라이더로 고른 값은 의도값이다. 적용값은 게이트를 거쳐 정해진다.
      state.intent[tokenKey] = parseFloat(lSlider.value);
      // Text 또는 Background가 바뀌면 상대편의 캡도 즉시 갱신
      recalcWcagCaps();
      refreshAllTokenUI();
      updateAll();
      scheduleLevelCompare();
    });
  }


});

/* ════════════════════════════════════════
   WCAG 캡 재계산 (FR-4: HSL & RGB 공통 원리 적용)
   ════════════════════════════════════════ */

/** 대비 게이트에 넣을 의도값 팔레트 — 색상·채도는 현재 값, 명도는 사용자가 고른 값. */
function intentTokens() {
  const tokens = {};
  for (const key of TOKEN_ORDER) {
    const token = state.tokens[key];
    tokens[key] = { h: token.h, s: token.s, l: state.intent[key] ?? token.l };
  }
  // 표면은 손으로 정하지 않고 M3 규칙대로 Primary·배경에서 파생한다(m3Palette.js).
  // 게이트와 파생 팔레트가 같은 값을 보도록 여기서 한 번만 적용한다.
  return deriveNeutralsFromPrimary(tokens, state.preset);
}

/** 현재 대비 수준에서 토큰이 지켜야 할 목표 대비비. */
function gateTarget(tokenKey) {
  return floorsForLevel(effectiveTargets())[tokenKey];
}

/** 토큰이 상대 토큰들에 대해 실제로 내고 있는 대비비 중 가장 낮은 값. */
function gateCurrentRatio(tokenKey) {
  const token = state.tokens[tokenKey];
  const rgb = hslToRgb(token.h, token.s, token.l);
  return Math.min(...GATE_REFS[tokenKey].refs.map(refKey => {
    const ref = state.tokens[refKey];
    return contrastBetween(rgb, hslToRgb(ref.h, ref.s, ref.l));
  }));
}

/**
 * 의도값에 현재 대비 수준의 게이트를 걸어 적용값을 만들고, 슬라이더 범위를 갱신한다.
 * 계산 자체는 gate.js의 순수 함수가 하고, 여기서는 그 결과를 DOM에 반영만 한다.
 * @returns {Array<{key:string, from:number, to:number}>} 실제로 조정된 토큰들
 */
function recalcWcagCaps() {
  const { tokens, ranges, adjustments } = projectPalette(intentTokens(), floorsForLevel(effectiveTargets()));
  state.tokens = tokens;

  for (const key of TOKEN_ORDER) {
    const section = document.querySelector(`.token-section[data-token="${key}"]`);
    const lSlider = section?.querySelector('.slider-l');
    if (!lSlider) continue;
    const { minL, maxL } = ranges[key];
    lSlider.min = minL;
    lSlider.max = maxL;
    lSlider.setAttribute('aria-valuemin', minL);
    lSlider.setAttribute('aria-valuemax', maxL);
    lSlider.value = tokens[key].l;
  }

  return adjustments;
}

/** 소수점이 있을 때만 한 자리까지 보여준다. 65.2를 65로 반올림해 숨기지 않기 위함. */
function formatLightness(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * 대비 수준을 바꾼 결과를 문장으로 알린다.
 * 이미 기준을 넘는 색은 조정할 것이 없어 화면이 그대로인데,
 * 그때 아무 안내가 없으면 컨트롤이 고장 난 것처럼 보인다.
 */
function announceGateResult(result) {
  const resultEl = document.getElementById('contrast-level-result');
  if (!resultEl) return;
  const levelLabel = CONTRAST_LEVELS[effectiveContrastLevel()].label;
  const parts = [];

  if (result.adjustments.length) {
    const detail = result.adjustments
      .map(item => `${TOKEN_META[item.key].label} 명도 ${formatLightness(item.from)} → ${formatLightness(item.to)}`)
      .join(', ');
    parts.push(`「${levelLabel}」 목표에 맞춰 ${detail}으로 조정했습니다.`);
  } else {
    parts.push(`「${levelLabel}」 목표가 현재 값과 같아 바뀐 것이 없습니다.`);
  }

  for (const warning of result.warnings || []) {
    parts.push(`${TOKEN_META[warning.key].label}는 고정 토큰이라 옮기지 않았습니다 —`
      + ` 배경 대비 ${warning.ratio.toFixed(1)}:1로 「${levelLabel}」 목표치 ${warning.target}:1에는 못 미칩니다`
      + ` (WCAG AA 3:1은 충족).`);
  }

  resultEl.textContent = parts.join(' ');
}

/** 비교 칼럼에 쓰는 짧은 토큰 이름. */
const SHORT_LABELS = { bg: '배경', text: '본문', accent: 'Primary' };

/**
 * 세 대비 수준을 같은 의도값에서 각각 투영해 나란히 보여준다.
 * 하나씩 전환하면 "바뀐 게 없다"로 보이기 쉬우므로, 고르기 전에 결과를 비교하게 한다.
 */
function renderLevelCompare() {
  const base = intentTokens();
  const effective = effectiveContrastLevel();
  const warnText = {};

  for (const level of Object.keys(CONTRAST_LEVELS)) {
    const option = document.querySelector(`.level-option[data-level="${level}"]`);
    if (!option) continue;

    const { tokens, adjustments, warnings } = derivePalette(base, CONTRAST_LEVELS[level]);

    for (const key of TOKEN_ORDER) {
      const swatch = option.querySelector(`.level-swatch[data-swatch="${key}"]`);
      if (!swatch) continue;
      const { r, g, b } = hslToRgb(tokens[key].h, tokens[key].s, tokens[key].l);
      swatch.style.backgroundColor = rgbToHex(r, g, b);
    }

    const delta = option.querySelector('.level-delta');
    if (delta) {
      delta.textContent = adjustments.length
        ? adjustments.map(item => {
            const from = hslToRgb(base[item.key].h, base[item.key].s, item.from);
            const to   = hslToRgb(base[item.key].h, base[item.key].s, item.to);
            return `${SHORT_LABELS[item.key]} BW ${calcBwIndex(from.r, from.g, from.b).toFixed(3)}`
                 + ` → ${calcBwIndex(to.r, to.g, to.b).toFixed(3)}`;
          }).join(' · ')
        : '현재와 동일';
    }

    const warn = option.querySelector('.level-warn');
    if (warn) {
      warn.textContent = warnings
        .map(w => `${SHORT_LABELS[w.key]} ${w.ratio.toFixed(1)}:1 · 목표 ${w.target}:1 미달`)
        .join(' · ');
    }

    option.classList.toggle('is-effective', level === effective);
    warnText[level] = warnings
      .map(w => `${SHORT_LABELS[w.key]} ${w.ratio.toFixed(1)}:1 · 목표 ${w.target}:1 미달`).join(' · ');
  }
  syncLevelSlider(effective, warnText);
}

/** 대비 수준 슬라이더(기본 · 중간 · 높음)를 현재 수준에 맞추고, 목표 미달인 수준의 눈금에만 빨간 점을 단다. */
function syncLevelSlider(effective, warnText) {
  const slider = document.getElementById('contrast-slider');
  if (!slider) return;
  const levels = Object.keys(CONTRAST_LEVELS);
  slider.value = String(Math.max(0, levels.indexOf(effective)));
  const warn = warnText[effective];
  slider.setAttribute('aria-valuetext', `${CONTRAST_LEVELS[effective].label}${warn ? ` · 경고: ${warn}` : ''}`);
  document.querySelectorAll('.level-tick').forEach(tick => {
    const level = tick.dataset.level;
    tick.classList.toggle('is-current', level === effective);
    if (warnText[level]) { tick.dataset.warn = 'true'; tick.dataset.tip = warnText[level]; }
    else { delete tick.dataset.warn; delete tick.dataset.tip; }
  });
}

/**
 * 대비 수준을 실제로 적용한다.
 * 수준은 「하한」이 아니라 「목표」다. 본문 명도를 그 수준의 목표 대비에 맞추고,
 * 그 결과를 의도값으로 채택해 이후 슬라이더 조작의 출발점으로 삼는다.
 */
function applyContrastLevel(level) {
  if (!CONTRAST_LEVELS[level]) return;
  state.contrastLevel = level;

  const derived = derivePalette(intentTokens(), CONTRAST_LEVELS[effectiveContrastLevel()]);
  for (const key of TOKEN_ORDER) state.intent[key] = derived.tokens[key].l;

  recalcWcagCaps();
  refreshAllTokenUI();
  updateAll();
  announceGateResult(derived);
  renderLevelCompare();
}

/** 슬라이더를 끄는 동안 매 입력마다 세 번 투영하지 않도록 프레임 단위로 모은다. */
let levelCompareFrame = 0;
function scheduleLevelCompare() {
  if (levelCompareFrame) return;
  levelCompareFrame = requestAnimationFrame(() => {
    levelCompareFrame = 0;
    renderLevelCompare();
  });
}

/* ════════════════════════════════════════
   UI 업데이트 함수들
   ════════════════════════════════════════ */

function updateTokenUI(tokenKey) {
  const tok = state.tokens[tokenKey];
  const { r, g, b } = hslToRgb(tok.h, tok.s, tok.l);
  const hex = rgbToHex(r, g, b);
  const bw  = calcBwIndex(r, g, b);

  const section = document.querySelector(`.token-section[data-token="${tokenKey}"]`);
  if (!section) return;

  // 스와치 및 헤더 정보
  const swatchEl = section.querySelector('.token-swatch');
  const hexEl    = section.querySelector('.token-hex');
  const bwEl2    = section.querySelector('.token-bw');
  if (swatchEl) swatchEl.style.backgroundColor = hex;
  if (hexEl)    hexEl.textContent = hex.toUpperCase();
  if (bwEl2)    bwEl2.textContent = `BW ${bw.toFixed(3)}`;

  // Material HCT 좌표 — 표시 전용(기준서 MD3-03). 이 값으로 색을 되돌려 만들지 않는다.
  const hctEl = section.querySelector('.token-hct');
  if (hctEl) hctEl.textContent = formatHct(hctFromRgb(r, g, b));

  const pickerEl = section.querySelector('.hue-slider');
  const colorCode = section.querySelector('.token-color-code');
  if (pickerEl) pickerEl.value = tok.h;
  const saturationSlider = section.querySelector('.slider-s');
  const saturationValue = section.querySelector('.slider-val-s');
  if (saturationSlider) {
    saturationSlider.value = tok.s;
    // background 단축 속성은 background-size/position까지 초기화하므로 backgroundImage만 바꾼다.
    // (트랙 두께는 CSS가 관리한다 — WCAG 2.5.8 타깃 확대와 함께 쓰임)
    saturationSlider.style.backgroundImage = `linear-gradient(to right, hsl(${tok.h}, 0%, 50%), hsl(${tok.h}, 100%, 50%))`;
  }
  if (saturationValue) saturationValue.textContent = Math.round(tok.s);
  if (colorCode) colorCode.textContent = hex.toUpperCase();

  // 대비 수치를 갱신한다. 「허용 명도」는 아래 슬라이더 범위에서 읽는다.
  const targetEl = section.querySelector('.gate-target');
  const currentEl = section.querySelector('.gate-current');
  if (targetEl)  targetEl.textContent = `${gateTarget(tokenKey)}:1`;
  if (currentEl) currentEl.textContent = `${gateCurrentRatio(tokenKey).toFixed(1)}:1`;

  // HSL L 슬라이더 동기화
  const lSlider = section.querySelector('.slider-l');
  const lValEl  = section.querySelector('.slider-val-l');
  if (lSlider) {
    lSlider.value = tok.l;
    if (lValEl) lValEl.textContent = formatLightness(tok.l);

    const rangeEl = section.querySelector('.gate-range');
    if (rangeEl) rangeEl.textContent =
      `${formatLightness(Number(lSlider.min))}–${formatLightness(Number(lSlider.max))}`;
    lSlider.style.backgroundImage = `linear-gradient(to right,
      hsl(${tok.h}, ${tok.s}%, 0%),
      hsl(${tok.h}, ${tok.s}%, 50%),
      hsl(${tok.h}, ${tok.s}%, 100%))`;

    // 슬라이더 아래 표시(2026-09-28): 「현재」는 손잡이 위치를 따라가며 지금 대비를, 「기준」은 허용 명도가 끝나는 쪽 끝에
    // 목표 대비를 적는다(슬라이더 범위가 곧 허용 명도라 그 끝이 기준을 만나는 점이다). 범위가 0~100 전체면 기준 끝이 없다.
    const target = gateTarget(tokenKey);
    const current = gateCurrentRatio(tokenKey);
    const min = Number(lSlider.min), max = Number(lSlider.max);
    const marks = section.querySelector('.slider-marks');
    if (marks) {
      const pct = max > min ? ((tok.l - min) / (max - min)) * 100 : 0;
      const cur = marks.querySelector('.mark-current');
      const tgt = marks.querySelector('.mark-target');
      cur.textContent = `현재 ${current.toFixed(1)}:1`;
      cur.style.setProperty('--mark-pos', `${pct}%`);
      const lowEdge = min > 0.05, highEdge = max < 99.95;
      tgt.textContent = `기준 ${target}:1`;
      tgt.hidden = !(lowEdge || highEdge);
      tgt.dataset.edge = lowEdge ? 'start' : 'end';
      marks.dataset.currentNear = (lowEdge && pct < 30) || (highEdge && !lowEdge && pct > 70) ? 'true' : 'false';
    }
    lSlider.setAttribute('aria-valuetext', `명도 ${formatLightness(tok.l)}, 대비 ${current.toFixed(1)}:1, 기준 ${target}:1`);
  }


}

/**
 * Styles › Color 페이지를 그린다(m3.material.io/styles/color).
 *
 * 항목은 M3 Color 메뉴의 견본으로 보여 줄 수 있는 것들이다 — Color roles · Add-on color roles(Color roles 페이지),
 * Tonal palettes(Color system › How the system works), Static colors(Advanced › Define new colors).
 * 모든 색은 4토큰에서 파생한 현재 스킴이다(명세 3.1 — M3 dynamic color는 쓰지 않는다).
 *
 * 따로 보기 바를 두지 않는다. 모드(Light · Dark)와 대비 단계는 계산기에서 고른 값을 그대로 따른다 —
 * 계산기가 이미 두 축을 전환하므로 같은 선택을 두 곳에 두지 않는다(2026-09-28).
 * 칸마다 역할 색을 칠하고 이름을 짝 역할 색으로 찍어, 표가 그대로 짝 · 대비 견본이 된다.
 * 짝이 정해지지 않은 칸(컨테이너 · dim/bright)은 이름을 Text에서 그 칸 기준으로 풀어 찍는다.
 */
const COLOR_ROLE_ROWS = [
  { label: 'Primary',   tiles: [['primary', 'on-primary'], ['on-primary', 'primary'], ['primary-container', 'on-primary-container'], ['on-primary-container', 'primary-container']] },
  { label: 'Secondary', tiles: [['secondary', 'on-secondary'], ['on-secondary', 'secondary'], ['secondary-container', 'on-secondary-container'], ['on-secondary-container', 'secondary-container']] },
  { label: 'Tertiary',  tiles: [['tertiary', 'on-tertiary'], ['on-tertiary', 'tertiary'], ['tertiary-container', 'on-tertiary-container'], ['on-tertiary-container', 'tertiary-container']] },
  { label: 'Error',     tiles: [['error', 'on-error'], ['on-error', 'error'], ['error-container', 'on-error-container'], ['on-error-container', 'error-container']] },
  { label: 'Surface',   tiles: [['surface', 'on-surface'], ['on-surface', 'surface'], ['on-surface-variant', 'surface']] },
  { label: 'Surface container', tiles: [['surface-container-lowest'], ['surface-container-low'], ['surface-container'], ['surface-container-high'], ['surface-container-highest']] },
  { label: 'Inverse',   tiles: [['inverse-surface', 'inverse-on-surface'], ['inverse-on-surface', 'inverse-surface'], ['inverse-primary', 'inverse-surface']] },
  { label: 'Outline',   outline: true, tiles: [['outline'], ['outline-variant']] },
];

const COLOR_ADDON_ROWS = ['primary', 'secondary', 'tertiary'].map(family => ({
  label: `${family[0].toUpperCase()}${family.slice(1)} fixed`,
  tiles: [[`${family}-fixed`, `on-${family}-fixed`], [`${family}-fixed-dim`, `on-${family}-fixed`],
    [`on-${family}-fixed`, `${family}-fixed`], [`on-${family}-fixed-variant`, `${family}-fixed`]],
})).concat([{ label: 'Surface dim · bright', tiles: [['surface-dim'], ['surface'], ['surface-bright']] }]);

/** Static colors 견본의 입력 색 — M3 문서 예시("Success")와 같은 초록. */
const STATIC_COLOR_SAMPLE = { name: 'Success', color: { h: 140, s: 60, l: 35 } };

const COLOR_VIEW_KEY = 'bw-color-view';
/** Static colors Live의 입력 색 · Harmonize만 기억한다. */
const colorView = { staticColor: null, harmonize: false };
try {
  const saved = JSON.parse(localStorage.getItem(COLOR_VIEW_KEY)) || {};
  colorView.staticColor = saved.staticColor ?? null;
  colorView.harmonize = !!saved.harmonize;
} catch (error) { /* 저장소 없음 */ }
function saveColorView() {
  try { localStorage.setItem(COLOR_VIEW_KEY, JSON.stringify(colorView)); } catch (error) { /* 저장소 없음 */ }
}

/** M3 역할 이름을 사이트 표기(문장형)로 — primary-container → Primary container. */
function roleLabel(role) {
  const text = role.replace(/-/g, ' ');
  return text[0].toUpperCase() + text.slice(1);
}

/** M3 역할 이름 → 지금 스킴의 색. 프로파일은 M3 surface = --bg, surface-container = --surface 토큰이다(명세 3.1). */
function colorScheme() {
  const tokens = state.tokens;
  const preset = state.preset;
  const level = effectiveContrastLevel();
  const target = contrastTargets(level).text;
  const { roles } = derivePaletteRoles(tokens, preset, target, contrastTargets(level));
  const ladder = deriveSurfaceContainers(tokens.bg, preset);
  const resolve = name => {
    if (name === 'surface') return roles.background;
    if (name === 'surface-container') return roles.surface;
    if (name === 'inverse-on-surface') return roles['on-inverse-surface'];
    return roles[name] || ladder[name];
  };
  // 짝이 없는 칸의 이름 색: Text를 그 칸 위에서 현재 대비 단계의 본문 기준을 채우는 가장 가까운 명도로.
  const labelOn = fill => derivePrimaryOnBg(tokens.text, [fill], target).color;
  return { tokens, preset, target, resolve, labelOn };
}

const cssColor = color => `hsl(${color.h}, ${color.s}%, ${color.l}%)`;

function colorBlock(name) {
  const block = document.createElement('section');
  block.className = 'btn-spec-block';
  block.setAttribute('aria-label', name);
  const heading = document.createElement('h3');
  heading.className = 'btn-spec-heading';
  heading.textContent = name;
  block.append(heading);
  return block;
}

function colorRow(label) {
  const line = document.createElement('div');
  line.className = 'btn-spec-row m3-color-row';
  const head = document.createElement('span');
  head.className = 'btn-spec-label';
  head.textContent = label;
  const list = document.createElement('ul');
  list.className = 'm3-color-tiles';
  list.setAttribute('aria-label', label);
  line.append(head, list);
  return { line, list };
}

/** 칸 하나. 이름을 짝 색으로 찍고, 보조 줄에 톤 · 대비를 적는다. */
function colorTile(list, { name, fill, on, border, role }) {
  const tile = document.createElement('li');
  tile.className = 'm3-color-tile';
  if (role) tile.dataset.role = role;
  tile.style.backgroundColor = cssColor(fill);
  tile.style.color = cssColor(on);
  if (border) {
    tile.dataset.outline = '';
    tile.style.borderColor = cssColor(border);
  }
  const title = document.createElement('span');
  title.className = 'm3-color-tile-name';
  title.textContent = name;
  tile.append(title);
  list.append(tile);
  return tile;
}

function renderRoleRows(host, rows, scheme) {
  const block = colorBlock('Configurations');
  for (const row of rows) {
    const { line, list } = colorRow(row.label);
    for (const [role, pair] of row.tiles) {
      const fill = scheme.resolve(role);
      if (row.outline) {
        colorTile(list, { name: roleLabel(role), role, fill: scheme.resolve('surface'), on: scheme.resolve('on-surface'), border: fill });
      } else {
        colorTile(list, { name: roleLabel(role), role, fill, on: pair ? scheme.resolve(pair) : scheme.labelOn(fill) });
      }
    }
    block.append(line);
  }
  host.replaceChildren(block);
}

/** Tonal palettes — 키 색 여섯 계열 × 톤 14단계. 칸 이름(톤 숫자)은 같은 팔레트의 흰색 · 검정으로 찍는다. */
function renderTonalPalettes(host, scheme) {
  const block = colorBlock('Configurations');
  for (const palette of deriveTonalPalettes(scheme.tokens.accent)) {
    const { line, list } = colorRow(palette.label);
    list.classList.add('m3-tone-tiles');
    const white = palette.tones.at(-1).color;
    const black = palette.tones[0].color;
    for (const { tone, color } of palette.tones) {
      // 톤 50 이상은 검정(≥ 4.6:1), 40 이하는 흰색(≥ 6.4:1) 글자가 본문 기준을 넘는다.
      const tile = colorTile(list, { name: String(tone), fill: color, on: tone >= 50 ? black : white });
      tile.classList.add('m3-tone-tile');
      tile.dataset.tone = String(tone);
    }
    block.append(line);
  }
  host.replaceChildren(block);
}

function staticTiles(list, name, roles) {
  const lower = name.toLowerCase();
  colorTile(list, { name, fill: roles.color, on: roles.on });
  colorTile(list, { name: `On ${lower}`, fill: roles.on, on: roles.color });
  colorTile(list, { name: `${name} container`, fill: roles.container, on: roles['on-container'] });
  colorTile(list, { name: `On ${lower} container`, fill: roles['on-container'], on: roles.container });
}

/** Static colors — Configurations(견본 색의 Static · Harmonized)와 Live(입력 색 · Harmonize). */
function renderStaticColors(host, scheme) {
  const primary = scheme.tokens.accent;
  const make = (color, harmonize) => deriveStaticColorRoles(color, primary, scheme.preset, scheme.target, { harmonize });

  const configurations = colorBlock('Configurations');
  for (const [label, harmonize] of [['Static', false], ['Harmonized', true]]) {
    const { line, list } = colorRow(label);
    staticTiles(list, STATIC_COLOR_SAMPLE.name, make(STATIC_COLOR_SAMPLE.color, harmonize).roles);
    configurations.append(line);
  }

  // Live는 입력 컨트롤을 한 번만 만들고(포커스 유지) 결과 줄만 다시 그린다.
  let live = host.querySelector('.m3-static-live');
  if (!live) {
    live = colorBlock('Live');
    live.classList.add('m3-static-live');
    const controls = document.createElement('div');
    controls.className = 'btn-spec-row m3-static-controls';
    controls.innerHTML = `<span class="btn-spec-label">Input</span>
      <label class="m3-static-input"><input type="color" data-static-input aria-label="Static color 입력 색"><span data-static-hex></span></label>
      <label class="toggle-wrap"><div class="toggle-track"><input type="checkbox" data-static-harmonize aria-label="Harmonize"><div class="toggle-thumb" aria-hidden="true"></div></div><span>Harmonize</span></label>`;
    const { line, list } = colorRow('Output');
    list.dataset.staticOutput = '';
    live.append(controls, line);
    controls.querySelector('[data-static-input]').addEventListener('input', event => {
      const { r, g, b } = hexToRgb(event.target.value);
      colorView.staticColor = rgbToHsl(r, g, b);
      saveColorView();
      renderColorStyle();
    });
    controls.querySelector('[data-static-harmonize]').addEventListener('change', event => {
      colorView.harmonize = event.target.checked;
      saveColorView();
      renderColorStyle();
    });
  }
  const input = colorView.staticColor || STATIC_COLOR_SAMPLE.color;
  const { r, g, b } = hslToRgb(input.h, input.s, input.l);
  const hex = rgbToHex(r, g, b);
  const picker = live.querySelector('[data-static-input]');
  if (picker.value.toLowerCase() !== hex.toLowerCase()) picker.value = hex;
  live.querySelector('[data-static-hex]').textContent = hex.toUpperCase();
  live.querySelector('[data-static-harmonize]').checked = !!colorView.harmonize;
  const output = live.querySelector('[data-static-output]');
  output.replaceChildren();
  const result = make(input, !!colorView.harmonize);
  staticTiles(output, 'Color', result.roles);
  output.setAttribute('aria-label', `Output · hue ${result.hue}°`);

  host.replaceChildren(configurations, live);
}

function renderColorStyle() {
  const hosts = {
    roles: document.getElementById('m3-color-roles'),
    addons: document.getElementById('m3-color-addons'),
    palettes: document.getElementById('m3-color-palettes'),
    statics: document.getElementById('m3-color-static'),
  };
  if (!Object.values(hosts).some(Boolean)) return;
  const scheme = colorScheme();
  if (hosts.roles) renderRoleRows(hosts.roles, COLOR_ROLE_ROWS, scheme);
  if (hosts.addons) renderRoleRows(hosts.addons, COLOR_ADDON_ROWS, scheme);
  if (hosts.palettes) renderTonalPalettes(hosts.palettes, scheme);
  if (hosts.statics) renderStaticColors(hosts.statics, scheme);
}


function refreshAllTokenUI() {
  ['bg', 'text', 'accent'].forEach(updateTokenUI);
}

function updateAll(persist = true) {
  document.documentElement.dataset.style = state.preset;
  document.querySelectorAll('.preset-btn').forEach(button => {
    const active = button.dataset.preset === state.preset;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  // CSS 커스텀 프로퍼티 업데이트
  const root = document.documentElement;
  // 4토큰에서 색 전체(M3 역할 40 · surface container 사다리 · 프로파일 글자 역할)를 파생해 CSS 변수로 내려보낸다.
  // 파생 순서는 scheme.js 한 곳에 있고, Figma 토큰 내보내기와 Pages 비교 패널도 같은 함수를 쓴다.
  const { vars, scheme } = schemeCssVars(state.tokens, state.preset, effectiveContrastLevel());
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
  state.roles = scheme.roles;
  const primaryText = scheme.primaryText;
  state.primaryOnBg = primaryText;
  state.textOnContainer = scheme.containerText;
  document.querySelectorAll('[data-primary-text-status]').forEach(el => {
    const target = contrastTargets(effectiveContrastLevel()).text;
    el.textContent = primaryText.lifted
      ? `글자용 Primary 보정됨 · 명도 ${state.tokens.accent.l}% → ${primaryText.color.l}% (${primaryText.ratio}:1, 기준 ${target}:1)`
      : `글자용 Primary 보정 없음 · ${primaryText.ratio.toFixed(2)}:1 (기준 ${target}:1)`;
  });
  // Pages 비교 패널 등 두 모드를 함께 그리는 곳에 알린다(compare.js)
  document.dispatchEvent(new CustomEvent('bw:scheme-change'));
  renderColorStyle();
  refreshNeutralInfo();

  // BW Index 계산
  const bwValues = {};
  Object.entries(state.tokens).forEach(([key, tok]) => {
    const { r, g, b } = hslToRgb(tok.h, tok.s, tok.l);
    bwValues[key] = calcBwIndex(r, g, b);
  });

  document.querySelectorAll('[data-bw-summary]').forEach(output => {
    output.textContent = bwValues[output.dataset.bwSummary].toFixed(3);
  });


  // 목표 계산과 같은 기준: 배경·Surface 중 더 낮은 본문 대비를 표시한다.
  const ratio = gateCurrentRatio('text');
  const passes  = passesWCAG_AA(ratio);
  const level   = effectiveContrastLevel();
  const targets = contrastTargets(level);

  const contrastEl = document.getElementById('stat-contrast');
  if (contrastEl) contrastEl.textContent = `${ratio.toFixed(1)}:1 · WCAG AA ${passes ? '통과' : '미달'}`;

  // 기준서 CON-5: 표준에는 대비 상한이 없다. 대신 여유분을 숫자로 드러낸다.
  const headroomEl = document.getElementById('stat-headroom');
  if (headroomEl) {
    const headroom = contrastHeadroom(ratio, level);
    headroomEl.textContent = headroom >= 1
      ? `${CONTRAST_LEVELS[level].label} 기준(${targets.text}:1) 대비 ${headroom.toFixed(1)}배 여유`
      : `${CONTRAST_LEVELS[level].label} 기준(${targets.text}:1)에 ${(targets.text - ratio).toFixed(1)} 모자람`;
  }

  document.querySelectorAll('input[name="contrast-level"]').forEach(input => {
    input.checked = input.value === effectiveContrastLevel();
  });
  const levelNote = document.getElementById('contrast-level-note');
  if (levelNote) {
    levelNote.textContent = prefersMoreContrastQuery?.matches
      ? '기기의 고대비 접근성 설정에 따라 「높음」을 적용했습니다.'
      : '기본 · WCAG AA가 요구하는 본문 4.5:1 · 비텍스트 3:1을 배경·Surface 양쪽에서 맞춥니다. 기준을 넘는 여유를 절감으로 돌리는 출발점입니다. 중간(7:1)은 AAA이자 M3 표준 수준의 본문 대비이고, M3 기본 색 구성은 본문을 약 16:1로 만듭니다.';
  }

  // 화면에 올라간 값이 확정된 뒤에 보관해야 게이트가 민 결과까지 함께 남는다.
  stashDraft();

  const snapshot = JSON.stringify({
    paletteVersion: 3,
    preset: state.preset,
    tokens: state.tokens,
    contrastLevel: state.contrastLevel,
    intent: state.intent,
    drafts: state.drafts,
  });
  if (persist) {
    try { localStorage.setItem(STATE_KEY, snapshot); } catch { /* Storage may be disabled. */ }
  }

}

/* ════════════════════════════════════════
   M3 중립 팔레트 — 배경·표면은 파생값이다
   ════════════════════════════════════════ */

/**
 * 파생 규칙을 문장으로 알린다.
 *
 * 파생값에는 조작 요소를 두지 않는다 — 표면은 네 축 모두, 배경은 색상·채도가
 * Primary에서 따라오므로 그 컨트롤은 마크업에서 아예 빼 두었다(잠긴 슬라이더를
 * 남기지 않는다). 열려 있는 건 Primary의 색상·채도·명도, 배경의 명도,
 * 본문의 색상·채도·명도뿐이고, 배경 명도는 발광량을 직접 정하는 축이라
 * 도구가 가져가지 않는다. 여기서는 그 규칙이 지금 어떤 값으로 적용됐는지만 쓴다.
 */
function refreshNeutralInfo() {
  const note = document.getElementById('neutral-link-note');
  if (note) {
    const primary = state.tokens.accent;
    const delta = surfaceToneDelta(state.preset);
    const direction = delta > 0 ? '밝게' : '어둡게';
    note.textContent = `Primary 색상 ${Math.round(primary.h)}° · 중립 채도 ${neutralSaturationFor(primary)}% `
      + `(M3 중립 팔레트 구조를 참고한 HSL 근사). 표면은 배경보다 ${Math.abs(delta)}톤 ${direction} `
      + '— Surface Container의 톤 간격을 참고한 단일 표면입니다.';
  }
}

/* ════════════════════════════════════════
   리셋 — 두 모드 모두 프리셋 기본값으로
   ════════════════════════════════════════ */

/** 어두운·밝은 작업본과 공유 Primary, 대비 수준을 한 번에 되돌린다. */
export function resetAll() {
  state.drafts = defaultDrafts();
  state.contrastLevel = DEFAULT_CONTRAST_LEVEL;
  loadDraft(state.preset);
  applyContrastLevel(DEFAULT_CONTRAST_LEVEL);
  refreshNeutralInfo();
  const resultEl = document.getElementById('contrast-level-result');
  if (resultEl) resultEl.textContent = '';
}

/**
 * 되돌릴 수 없는 조작이라 확인 대화상자를 거친다.
 * 페이지를 멈추는 confirm() 대신 <dialog>를 쓴다. Escape 닫기, 포커스 가둠,
 * 최상위 레이어 렌더링이 기본으로 따라오고 패널의 overflow:hidden에도 잘리지 않는다.
 */
function initResetButton() {
  const button = document.getElementById('btn-reset');
  const dialog = document.getElementById('reset-dialog');
  if (!button || !dialog) return;

  const close = () => {
    if (dialog.open) dialog.close();
    // 대화상자를 연 버튼으로 포커스를 돌려준다(WCAG 2.4.3).
    button.focus();
  };

  button.addEventListener('click', () => {
    // <dialog> 미지원 환경에서는 확인 없이 지우지 않고 그냥 실행한다.
    if (typeof dialog.showModal !== 'function') {
      resetAll();
      announceReset();
      return;
    }
    dialog.showModal();
  });

  dialog.querySelector('#reset-cancel')?.addEventListener('click', close);
  dialog.querySelector('#reset-confirm')?.addEventListener('click', () => {
    close();
    resetAll();
    announceReset();
  });

  // 바깥 여백(백드롭)을 누르면 닫는다.
  dialog.addEventListener('click', event => {
    if (event.target === dialog) close();
  });
}

function announceReset() {
  const resultEl = document.getElementById('contrast-level-result');
  if (resultEl) resultEl.textContent = '두 모드를 모두 프리셋 기본값으로 되돌렸습니다.';
}

/* ════════════════════════════════════════
   초기화
   ════════════════════════════════════════ */

function init() {
  // Restore shared settings instead of resetting on every page change.
  const params = new URLSearchParams(location.search);
  let saved = parseSettings(params.get('ui'));
  if (!saved) {
    try { saved = parseSettings(localStorage.getItem(STATE_KEY)); } catch { /* Optional persistence. */ }
  }
  if (saved) {
    Object.assign(state, saved);
  } else if (prefersDarkQuery) {
    // 저장된 설정이 없을 때만 기기 선호를 따른다(기준서 TKN-04).
    state.preset = prefersDarkQuery.matches ? 'dark-saving' : 'light-saving';
    state.drafts = defaultDrafts();
    loadDraft(state.preset);
  }

  document.querySelectorAll('input[name="contrast-level"]').forEach(input => {
    input.checked = input.value === state.contrastLevel;
    // click은 새로 고를 때와 같은 수준을 다시 누를 때 모두 발생한다.
    // 슬라이더로 본문을 바꾼 뒤 같은 수준을 다시 눌러 목표로 되돌리는 경우를 위해서다.
    input.addEventListener('click', () => {
      if (input.checked) applyContrastLevel(input.value);
    });
  });

  const levelSlider = document.getElementById('contrast-slider');
  levelSlider?.addEventListener('input', () => {
    const level = Object.keys(CONTRAST_LEVELS)[Number(levelSlider.value)];
    const radio = document.querySelector(`input[name="contrast-level"][value="${level}"]`);
    if (radio) radio.checked = true;
    applyContrastLevel(level);
  });

  const exportButton = document.getElementById('btn-export-dtcg');
  if (exportButton) exportButton.addEventListener('click', () => downloadFigmaTokens(state));
  initResetButton();

  // 기기 선호가 바뀌면 게이트를 다시 계산한다.
  prefersMoreContrastQuery?.addEventListener?.('change', () => applyContrastLevel(state.contrastLevel));

  // 첫 화면은 저장된 높은 본문 밝기를 그대로 복원하지 않고 기본(AA) 목표로 시작한다.
  // 기기의 고대비 접근성 선호는 effectiveContrastLevel()에서 우선 적용한다.
  // Remove the transfer snapshot so refreshing uses the latest saved edits.
  if (params.has('ui')) {
    params.delete('ui');
    try { history.replaceState(null, '', location.pathname + (params.size ? '?' + params : '') + location.hash); } catch { /* file:// may restrict history. */ }
  }


  // 첫 번째 토큰 섹션만 펼쳐 둔다. 대비가 Primary를 기준으로 움직이므로
  // 마크업 순서상 Primary가 맨 앞이고, 여기서 열리는 것도 Primary다.
  document.querySelectorAll('.token-section').forEach((section, i) => {
    section.classList.toggle('open', i === 0);
    section.querySelector('.token-header')?.setAttribute('aria-expanded', String(i === 0));
  });

  applyContrastLevel(DEFAULT_CONTRAST_LEVEL);
  const resultEl = document.getElementById('contrast-level-result');
  if (resultEl) resultEl.textContent = '';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}


// storage events synchronize other open same-origin calculator/library tabs.
window.addEventListener('storage', event => {
  if (event.key !== STATE_KEY) return;
  const incoming = parseSettings(event.newValue);
  if (!incoming) return;
  Object.assign(state, incoming);
  recalcWcagCaps();
  refreshAllTokenUI();
  updateAll(false);
  renderLevelCompare();
});

/**
 * 두 모드의 현재 4토큰(그 모드 · 현재 대비 단계 적용) — Pages 비교 패널이 쓴다.
 * 지금 모드는 계산기 상태 그대로, 다른 모드는 보관된 작업본을 같은 대비 단계로 맞춘다(Figma 내보내기와 같은 경로).
 */
export function schemeInputs() {
  const level = effectiveContrastLevel();
  const tokens = {};
  for (const key of PRESET_KEYS) {
    tokens[key] = key === state.preset ? clone(state.tokens) : levelTokens(state.drafts[key], key, level);
  }
  return { level, tokens };
}
