// Text fields 규칙 — M3 Text fields(Filled · Outlined). 순수 계산만 두고 DOM은 patterns.js가 다룬다.

/** M3 치수(Specs · Compose TextFieldImpl): 높이 56, 좌우 16(아이콘 있으면 12), 아이콘-글 16, 보조 글 위 4, 보조 글-글자 수 16 */
export const TEXT_FIELD = { height: 56, padding: 16, iconPadding: 12, iconGap: 16, icon: 24, supportTop: 4, counterGap: 16, labelInset: 4, line: 24 };

/** 글자 수 — "사용 / 최대". 최대를 넘으면 over. 낭독용 문구는 "글자 수"(M3 Accessibility). */
export function tfCounter(length, max) {
  const used = Math.max(0, length | 0);
  return { text: `${used}/${max}`, over: used > max, label: `글자 수 ${used}자, 최대 ${max}자` };
}

/** 보조 글 자리 — 오류가 있으면 보조 글을 오류 글로 바꾼다(덧붙이지 않음, M3 Error text). 오류는 role="alert". */
export function tfMessage({ supporting = '', error = '' } = {}) {
  if (error) return { text: error, error: true, role: 'alert' };
  return { text: supporting, error: false, role: null };
}

/** 검증 — 필수 · 이메일 · 최대 길이. 오류 문구(없으면 ''). 오류 문구는 고치는 방법을 말한다(M3 Error text). */
export function tfValidate(value, { required = false, type = 'text', maxLength = Infinity } = {}) {
  const v = String(value ?? '');
  if (required && !v.trim()) return '필수 항목입니다. 내용을 입력하세요.';
  if (v.length > maxLength) return `${maxLength}자 이하로 입력하세요.`;
  if (type === 'email' && v.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return '이메일 형식으로 입력하세요(예: name@example.com).';
  return '';
}

/** 여러 줄 필드 높이 — 내용 높이에 맞춰 늘어나고(최소 1줄), maxRows가 있으면 거기서 멈추고 스크롤. */
export function tfAutoHeight(contentHeight, { line = TEXT_FIELD.line, minRows = 1, maxRows = Infinity } = {}) {
  const rows = Math.max(minRows, Math.ceil(Math.max(0, contentHeight) / line));
  const capped = Math.min(rows, maxRows);
  return { height: capped * line, scroll: rows > maxRows };
}
