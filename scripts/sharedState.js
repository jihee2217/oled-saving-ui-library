import { PRESETS } from './presets.js';

export const STATE_KEY = 'bw-index-ui-state-v1';

export const PRESET_KEYS = ['dark-saving', 'light-saving'];
const TOKEN_KEYS = ['bg', 'surface', 'text', 'accent'];

const inRange = (n, max) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= max;

/** 토큰 네 개가 모두 유효할 때만 통과시킨다. 하나라도 어긋나면 null. */
function parseTokens(raw) {
  const tokens = {};
  for (const key of TOKEN_KEYS) {
    const token = raw?.[key];
    if (!token || !inRange(token.h, 360) || !inRange(token.s, 100) || !inRange(token.l, 100)) return null;
    tokens[key] = { h: token.h, s: token.s, l: token.l };
  }
  return tokens;
}

/** 의도 명도가 없거나 범위를 벗어나면 적용값을 그대로 의도값으로 본다. */
function parseIntent(raw, tokens) {
  const intent = {};
  for (const key of TOKEN_KEYS) {
    const saved = raw?.[key];
    intent[key] = inRange(saved, 100) ? saved : tokens[key].l;
  }
  return intent;
}

/** 프리셋 기본값으로 만든 작업본. */
export function defaultDraft(presetKey) {
  const tokens = structuredClone(PRESETS[presetKey].tokens);
  return { tokens, intent: parseIntent(null, tokens) };
}

/** 두 모드 모두 프리셋 기본값인 작업본 묶음. 리셋과 첫 실행이 함께 쓴다. */
export function defaultDrafts() {
  return Object.fromEntries(PRESET_KEYS.map(key => [key, defaultDraft(key)]));
}

/** Validate persisted or transferred settings before applying them. */
export function parseSettings(raw) {
  try {
    const value = JSON.parse(raw);
    if (!value || !PRESET_KEYS.includes(value.preset)) return null;
    const tokens = parseTokens(value.tokens);
    if (!tokens) return null;

    // Upgrade only unchanged legacy blue defaults; retain custom colors.
    const oldAccent = value.preset === 'dark-saving' ? { h: 220, s: 60, l: 60 } : { h: 220, s: 80, l: 42 };
    if (value.paletteVersion !== 2 && value.paletteVersion !== 3
      && ['h', 's', 'l'].every(ch => tokens.accent[ch] === oldAccent[ch])) {
      tokens.accent = { ...PRESETS[value.preset].tokens.accent };
    }

    const contrastLevel = ['standard', 'medium', 'high'].includes(value.contrastLevel)
      ? value.contrastLevel : 'standard';
    const intent = parseIntent(value.intent, tokens);

    // 모드별 작업본. 없거나 깨진 모드는 프리셋 기본값으로 채운다.
    // 저장본이 작업본을 갖기 전(v2 이하)이라면 현재 모드만 저장본에서 살아남는다.
    const drafts = {};
    for (const key of PRESET_KEYS) {
      const savedDraft = value.drafts?.[key];
      const draftTokens = parseTokens(savedDraft?.tokens);
      drafts[key] = draftTokens
        ? { tokens: draftTokens, intent: parseIntent(savedDraft?.intent, draftTokens) }
        : defaultDraft(key);
    }
    // 최상위 값이 현재 모드의 정본이다.
    drafts[value.preset] = { tokens: structuredClone(tokens), intent: { ...intent } };

    return { preset: value.preset, tokens, contrastLevel, intent, drafts };
  } catch { return null; }
}
