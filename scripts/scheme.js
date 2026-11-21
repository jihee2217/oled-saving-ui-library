/**
 * scheme.js
 * 한 모드(어두운/밝은) × 한 대비 단계의 색 전체를 4토큰에서 만든다.
 *
 * 화면(app.js updateAll)과 Figma 토큰 내보내기(figmaTokens.js)가 이 함수 하나를 같이 쓴다.
 * 둘이 따로 계산하면 화면과 Figma 값이 어긋나므로, 파생 순서를 여기에만 둔다.
 *   1) M3 역할 40개(기존 26 + add-on 14)         derivePaletteRoles
 *   2) surface container 사다리(surface-container 제외 — --surface 토큰이 정본)  deriveSurfaceContainers
 *   3) 프로파일 글자 역할: primary-on-bg · secondary-on-bg · error-on-bg(명세 4.1.4 · 4.1.8), text-on-container(4.1.5)
 */

import { derivePalette, TOKEN_ORDER } from './gate.js';
import { contrastTargets } from './contrastLevels.js';
import { hslToRgb } from './colorModel.js';
import { onColor } from './contrast.js';
import {
  derivePaletteRoles, deriveNeutralsFromPrimary, deriveSurfaceContainers,
  derivePrimaryOnBg, containerTextAnchors, primaryTextAnchors, compositeOver,
} from './m3Palette.js';

/**
 * 저장된 작업본(4토큰 + 사용자가 정한 명도 의도)을 특정 대비 단계에 맞춘 4토큰으로 만든다.
 * 계산기에서 그 단계를 눌렀을 때와 같은 경로다(app.js intentTokens → derivePalette).
 * @param {{tokens: object, intent?: object}} draft
 * @param {'dark-saving'|'light-saving'} preset
 * @param {'standard'|'medium'|'high'} levelKey
 */
export function levelTokens(draft, preset, levelKey) {
  const intent = {};
  for (const key of TOKEN_ORDER) {
    const token = draft.tokens[key];
    intent[key] = { h: token.h, s: token.s, l: draft.intent?.[key] ?? token.l };
  }
  return derivePalette(deriveNeutralsFromPrimary(intent, preset), contrastTargets(levelKey)).tokens;
}

/**
 * @param {object} tokens 대비 단계가 적용된 4토큰 {bg, surface, text, accent}
 * @param {'dark-saving'|'light-saving'} preset
 * @param {'standard'|'medium'|'high'} levelKey
 * @returns {{roles, containers, primaryText, secondaryText, errorText, errorHoverText, containerText}}
 */
export function deriveSchemeColors(tokens, preset, levelKey) {
  const level = contrastTargets(levelKey);
  const { roles } = derivePaletteRoles(tokens, preset, level.text, level);
  const containers = deriveSurfaceContainers(tokens.bg, preset);
  delete containers['surface-container'];
  const anchors = primaryTextAnchors(tokens.bg, tokens.surface, preset);
  const primaryText = derivePrimaryOnBg(tokens.accent, anchors, level.text);
  const secondaryText = derivePrimaryOnBg(roles.secondary, anchors, level.text);
  // 글자로 쓰는 Error(명세 4.1.8 추가, 2026-10-18) — 오류 라벨 · 안내 글. Secondary와 같은 방식으로 대비 단계를 따른다
  const errorText = derivePrimaryOnBg(roles.error, anchors, level.text);
  // 오류 필드 hover 라벨(명세 4.1.8 추가, 2026-10-18) — M3는 on-error-container. hover 상태 레이어(Text 8%)가 깔린
  // Filled 필드 바탕까지 기준에 넣어, on-error-container와 글자용 Error를 각각 기준에 맞춘 뒤 대비가 더 높은 쪽을 쓴다.
  // 기본 단계는 on-error-container가 그대로 이겨 M3와 같고, 높은 단계에서도 평소 라벨보다 흐려지지 않는다(역전 없음).
  const hoverAnchors = [...anchors, compositeOver(containers['surface-container-highest'], tokens.text, 0.08)];
  const hoverFromM3 = derivePrimaryOnBg(roles['on-error-container'], hoverAnchors, level.text);
  const hoverFromError = derivePrimaryOnBg(errorText.color, hoverAnchors, level.text);
  const errorHoverText = hoverFromM3.ratio >= hoverFromError.ratio ? hoverFromM3 : hoverFromError;
  const cardAnchors = containerTextAnchors(tokens.bg, tokens.surface, preset, roles.secondary,
    { text: tokens.text, secondaryContainer: roles['secondary-container'], primary: roles.primary });
  const containerText = derivePrimaryOnBg(tokens.text, cardAnchors, level.text);
  return { roles, containers, primaryText, secondaryText, errorText, errorHoverText, containerText };
}

/**
 * 한 모드의 색 전체를 CSS 변수 묶음으로 — 화면 루트(app.js updateAll)와 Pages 비교 패널(compare.js)이 같이 쓴다.
 * 4토큰의 H · S · L 변수, on-primary, M3 역할 40, surface container 사다리, 프로파일 글자 역할, inverse 별칭.
 * @returns {{vars: Object<string,string>, scheme: object}}
 */
export function schemeCssVars(tokens, preset, levelKey) {
  const vars = {};
  const TOKEN_VARS = { bg: 'bg', surface: 'sf', text: 'tx', accent: 'ac' };
  for (const [key, prefix] of Object.entries(TOKEN_VARS)) {
    const tok = tokens[key];
    vars[`--${prefix}-h`] = String(tok.h);
    vars[`--${prefix}-s`] = `${tok.s}%`;
    vars[`--${prefix}-l`] = `${tok.l}%`;
  }
  const accent = tokens.accent;
  vars['--on-primary'] = onColor(hslToRgb(accent.h, accent.s, accent.l));
  const scheme = deriveSchemeColors(tokens, preset, levelKey);
  const hsl = color => `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
  for (const [role, color] of Object.entries(scheme.roles)) vars[`--${role}`] = hsl(color);
  for (const [role, color] of Object.entries(scheme.containers)) vars[`--${role}`] = hsl(color);
  vars['--primary-on-bg'] = hsl(scheme.primaryText.color);
  vars['--secondary-on-bg'] = hsl(scheme.secondaryText.color);
  vars['--error-on-bg'] = hsl(scheme.errorText.color);
  vars['--error-hover-on-bg'] = hsl(scheme.errorHoverText.color);
  vars['--text-on-container'] = hsl(scheme.containerText.color);
  vars['--inverse-on-surface'] = 'var(--on-inverse-surface)';
  return { vars, scheme };
}
