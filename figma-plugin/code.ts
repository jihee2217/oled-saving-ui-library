// BW Index 토큰 가져오기
// 사이트 계산기의 「Figma 토큰 내보내기 (.zip)」 묶음을 읽어
//   1) 변수 컬렉션 Color(모드 최대 6) · Space · Shape · Typescale · State · Motion
//   2) 텍스트 스타일 baseline/* · emphasized/* (Typescale 변수에 연결)
//   3) 이펙트 스타일 elevation/*
// 를 만들거나, 같은 이름이 있으면 값만 고친다. zip 해제는 UI(iframe)에서 하고 여기에는 JSON 텍스트만 온다.
// 공식 M3 키트를 복제한 파일에서는 키트의 변수(M3 · Font theme · Typescale)에 값을 넣는다 — 아래 「공식 M3 키트 사본」.

const PANEL_WIDTH = 320
const EXT = 'kr.bwindex.energy-saving-ui'
const PLUGIN_ID = '9e04d2f7-5691-4212-a963-955d203973e2'

const COLOR_MODES = ['Dark-Standard', 'Dark-Medium', 'Dark-High', 'Light-Standard', 'Light-Medium', 'Light-High']

type ImportMessage = {
  type: 'import'
  files: { [name: string]: string }
  colorMode: string // 'all' 또는 모드 이름 하나
  doVariables: boolean
  doText: boolean
  doEffects: boolean
}
type UiMessage = { type: 'resize'; height: number } | ImportMessage

type Json = unknown
type Leaf = { path: string; token: Record<string, Json> }

/** JSON 안을 안전하게 따라간다. */
function get(obj: Json, ...keys: (string | number)[]): Json {
  let cur: Json = obj
  for (const k of keys) {
    if (cur === null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string | number, Json>)[k]
  }
  return cur
}
const num = (v: Json): number => Number(v)
const str = (v: Json): string => (typeof v === 'string' ? v : '')
const isObj = (v: Json): v is Record<string, Json> => v !== null && typeof v === 'object' && !Array.isArray(v)
function extOf(token: Json): Record<string, Json> {
  const e = get(token, '$extensions', EXT)
  return isObj(e) ? e : {}
}

figma.showUI(__html__, { width: PANEL_WIDTH, height: 420 })
figma.root.setRelaunchData({ [PLUGIN_ID]: '토큰 묶음으로 변수와 스타일 갱신' })

function setStatus(text: string, tone: 'info' | 'ok' | 'error' = 'info') {
  figma.ui.postMessage({ type: 'status', text, tone })
}
function log(text: string) {
  figma.ui.postMessage({ type: 'log', text })
}

/** $value를 가진 객체를 경로(a/b/c)와 함께 모은다. $로 시작하는 키는 건너뛴다. */
function leaves(obj: Json, path: string[] = []): Leaf[] {
  if (!isObj(obj)) return []
  if ('$value' in obj) return [{ path: path.join('/'), token: obj }]
  const out: Leaf[] = []
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$')) continue
    out.push(...leaves(obj[key], [...path, key]))
  }
  return out
}

function parse(files: { [name: string]: string }, name: string): Json {
  const text = files[name]
  if (!text) return null
  try { return JSON.parse(text) as Json } catch (_e) { throw new Error(`${name}을(를) 읽지 못했어요 (JSON 형식 오류)`) }
}

/* ─── 변수 ─── */

function resolvedType(token: Record<string, Json>): VariableResolvedDataType {
  if (token.$type === 'color') return 'COLOR'
  if (token.$type === 'fontFamily') return 'STRING'
  return 'FLOAT'
}

function figmaValue(token: Record<string, Json>): VariableValue {
  const v = token.$value
  if (token.$type === 'color') {
    const alpha = get(v, 'alpha')
    return { r: num(get(v, 'components', 0)), g: num(get(v, 'components', 1)), b: num(get(v, 'components', 2)), a: typeof alpha === 'number' ? alpha : 1 }
  }
  if (token.$type === 'dimension') return num(get(v, 'value'))
  // Figma에는 시간 단위가 없으므로 ms 숫자로 둔다(코드 표기 var(--md-duration-*)와 같은 값).
  if (token.$type === 'duration') return Math.round(num(get(v, 'value')) * (get(v, 'unit') === 's' ? 1000 : 1))
  if (token.$type === 'fontFamily') return Array.isArray(v) ? String(v[0]) : String(v)
  return Number(v)
}

/** 변수가 뜨는 자리(Figma 스코프). 이름과 컬렉션으로 정한다. */
function scopesFor(collection: string, path: string): VariableScope[] {
  const name = path.split('/').pop() || ''
  if (collection === 'Color') {
    const group = path.split('/')[0]
    if (group === 'text' || name.startsWith('on-')) return ['TEXT_FILL', 'SHAPE_FILL', 'STROKE_COLOR']
    if (group === 'outline') return ['STROKE_COLOR', 'SHAPE_FILL']
    if (name === 'scrim') return ['FRAME_FILL', 'SHAPE_FILL']
    if (['primary', 'secondary', 'tertiary', 'error', 'inverse-primary'].includes(name)) return ['ALL_FILLS', 'STROKE_COLOR']
    return ['FRAME_FILL', 'SHAPE_FILL', 'STROKE_COLOR']
  }
  if (collection === 'Space') return ['GAP', 'WIDTH_HEIGHT']
  if (collection === 'Shape') return ['CORNER_RADIUS']
  if (collection === 'Typescale') {
    if (path === 'font/sans') return ['FONT_FAMILY']
    if (name === 'size') return ['FONT_SIZE']
    if (name === 'line-height') return ['LINE_HEIGHT']
    if (name === 'weight') return ['FONT_WEIGHT']
    if (name === 'tracking') return ['LETTER_SPACING']
  }
  if (collection === 'State') {
    if (path.startsWith('layer/') || path.startsWith('disabled/')) return ['OPACITY']
    if (path === 'focus-ring/width') return ['STROKE_FLOAT']
  }
  return []
}

/** 코드 표기: 색은 $extensions의 cssVar, 나머지는 설명에 적힌 CSS 변수 이름. */
function cssVarFor(token: Record<string, Json>): string | null {
  const ext = extOf(token)
  if (typeof ext.cssVar === 'string') return ext.cssVar
  const match = typeof token.$description === 'string' ? token.$description.match(/--[a-z0-9-]+/) : null
  return match ? match[0] : null
}

async function getOrCreateCollection(name: string): Promise<{ collection: VariableCollection; created: boolean }> {
  const all = await figma.variables.getLocalVariableCollectionsAsync()
  const found = all.find(c => c.name === name)
  if (found) return { collection: found, created: false }
  return { collection: figma.variables.createVariableCollection(name), created: true }
}

/**
 * 컬렉션이 원하는 모드를 모두 갖게 한다. 반환: 모드 이름 → id.
 * 새 컬렉션의 첫 모드는 이름을 바꿔 쓴다. 모드 하나만 원하고 컬렉션에 모드가 하나뿐이면 그 모드의 이름을 바꾼다
 * (Starter 플랜에서 다른 색 모드로 바꿔 넣는 경우).
 */
function ensureModes(collection: VariableCollection, names: string[]): { [name: string]: string } {
  const ids: { [name: string]: string } = {}
  const byName = (n: string) => collection.modes.find(m => m.name === n)
  if (names.length === 1 && collection.modes.length === 1 && !byName(names[0])) {
    collection.renameMode(collection.modes[0].modeId, names[0])
  }
  for (const name of names) {
    let mode = byName(name)
    if (!mode) {
      const unused = collection.modes.length === 1 && collection.modes[0].name.match(/^Mode \d+$|^Value$|^Default$/)
      if (unused) {
        collection.renameMode(collection.modes[0].modeId, name)
      } else {
        try {
          collection.addMode(name)
        } catch (_e) {
          throw new Error(`'${collection.name}' 컬렉션에 모드를 더 만들 수 없어요. Figma Starter 플랜은 컬렉션당 모드가 1개예요 — '색 모드'에서 하나만 골라 다시 실행하세요.`)
        }
      }
      mode = byName(name)
    }
    if (mode) ids[name] = mode.modeId
  }
  return ids
}

type VarStats = { created: number; updated: number; skipped: string[] }

/** 한 컬렉션에 토큰을 쓴다. docsByMode: 모드 이름 → 토큰 문서. */
async function writeCollection(name: string, docsByMode: { [mode: string]: Json }, stats: VarStats) {
  const modes = Object.keys(docsByMode)
  const { collection } = await getOrCreateCollection(name)
  const modeIds = ensureModes(collection, modes)
  const existing = (await figma.variables.getLocalVariablesAsync()).filter(v => v.variableCollectionId === collection.id)
  const byName = new Map(existing.map(v => [v.name, v]))
  const first = leaves(docsByMode[modes[0]])
  for (const { path, token } of first) {
    const type = resolvedType(token)
    let variable = byName.get(path)
    if (variable && variable.resolvedType !== type) {
      stats.skipped.push(`${name}/${path} (이미 다른 종류의 변수가 있음)`)
      continue
    }
    if (!variable) {
      variable = figma.variables.createVariable(path, collection, type)
      byName.set(path, variable)
      stats.created++
    } else {
      stats.updated++
    }
    for (const mode of modes) {
      const modeToken = leaves(docsByMode[mode]).find(l => l.path === path)
      if (!modeToken) { stats.skipped.push(`${name}/${path} (${mode} 모드 값 없음)`); continue }
      variable.setValueForMode(modeIds[mode], figmaValue(modeToken.token))
    }
    if (typeof token.$description === 'string') variable.description = token.$description
    variable.scopes = scopesFor(name, path)
    const css = cssVarFor(token)
    if (css) variable.setVariableCodeSyntax('WEB', `var(${css})`)
  }
}

async function importVariables(files: { [name: string]: string }, colorMode: string) {
  const stats: VarStats = { created: 0, updated: 0, skipped: [] }
  const colorDocs: { [mode: string]: Json } = {}
  const wanted = colorMode === 'all' ? COLOR_MODES : [colorMode]
  for (const mode of wanted) {
    const doc = parse(files, `${mode}.tokens.json`)
    if (doc) colorDocs[mode] = doc
  }
  const errors: string[] = []
  if (Object.keys(colorDocs).length) {
    setStatus('색 변수를 쓰는 중…')
    try { await writeCollection('Color', colorDocs, stats) } catch (e) { errors.push(String((e as Error).message || e)) }
  }
  const single: [string, string][] = [
    ['Space', 'space.tokens.json'], ['Shape', 'shape.tokens.json'], ['Typescale', 'typescale.tokens.json'],
    ['State', 'state.tokens.json'], ['Motion', 'motion.tokens.json'],
  ]
  for (const [collection, file] of single) {
    const doc = parse(files, file)
    if (!doc) continue
    setStatus(`${collection} 변수를 쓰는 중…`)
    try { await writeCollection(collection, { Value: doc }, stats) } catch (e) { errors.push(String((e as Error).message || e)) }
  }
  return { stats, errors }
}

/* ─── 공식 M3 키트 사본 ───
   Google 「Material 3 Design Kit」을 복제한 파일이면(M3 컬렉션에 Schemes/Primary가 있음) 우리 이름 체계 대신
   키트의 변수에 값을 넣는다: M3 컬렉션의 Schemes · State Layers, Font theme의 글꼴, Typescale의 절감형 굵기 모드. */

const KIT_MODES: { [mode: string]: string } = {
  'Light-Standard': 'Light', 'Light-Medium': 'Light Medium Contrast', 'Light-High': 'Light High Contrast',
  'Dark-Standard': 'Dark', 'Dark-Medium': 'Dark Medium Contrast', 'Dark-High': 'Dark High Contrast',
}
const KIT_WEIGHT: { [w: number]: string } = {
  100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black',
}

async function findKit(): Promise<VariableCollection | null> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync()
  const m3 = collections.find(c => c.name === 'M3')
  if (!m3) return null
  const all = await figma.variables.getLocalVariablesAsync()
  return all.some(v => v.variableCollectionId === m3.id && v.name === 'Schemes/Primary') ? m3 : null
}

/** 변수 값을 바꾸면 그 변수를 쓰는 글자의 글꼴이 불려 있어야 한다. 오류가 알려 주는 글꼴을 불러와 다시 시도한다. */
let fontList: Font[] | null = null
async function withFonts(fn: () => void) {
  for (let i = 0; i < 80; i++) {
    try { fn(); return } catch (e) {
      const m = String((e as Error).message || e).match(/unloaded font "([^"]+)"/)
      if (!m) throw e
      if (!fontList) fontList = await figma.listAvailableFontsAsync()
      const f = fontList.find(x => `${x.fontName.family} ${x.fontName.style}` === m[1])
      if (!f) throw new Error(`'${m[1]}' 글꼴을 불러오지 못했어요`)
      await figma.loadFontAsync(f.fontName)
    }
  }
  throw new Error('글꼴을 불러오다가 멈췄어요')
}

/** 키트 역할 이름 → 우리 CSS 변수 이름. Surface Tint는 Primary, Inverse On Surface는 on-inverse-surface. */
function kitRole(name: string): string {
  const k = name.toLowerCase().replace(/ /g, '-')
  if (k === 'inverse-on-surface') return 'on-inverse-surface'
  if (k === 'surface-tint') return 'primary'
  return k
}

type KitStats = { modes: string[]; colors: number; layers: number; palette: number; font: string; weights: number; notes: string[] }

async function importKit(m3: VariableCollection, files: { [name: string]: string }, colorMode: string): Promise<KitStats> {
  const stats: KitStats = { modes: [], colors: 0, layers: 0, palette: 0, font: '', weights: 0, notes: [] }
  const collections = await figma.variables.getLocalVariableCollectionsAsync()
  const all = await figma.variables.getLocalVariablesAsync()
  const m3vars = all.filter(v => v.variableCollectionId === m3.id)
  const missing = new Set<string>()
  const wanted = colorMode === 'all' ? COLOR_MODES : [colorMode]
  for (const mode of wanted) {
    const doc = parse(files, `${mode}.tokens.json`)
    if (!doc) continue
    const target = KIT_MODES[mode]
    let kitMode = m3.modes.find(m => m.name === target)
    if (!kitMode) {
      try { m3.addMode(target) } catch (_e) { stats.notes.push(`M3 컬렉션에 '${target}' 모드를 만들 수 없어 건너뛰었어요`); continue }
      kitMode = m3.modes.find(m => m.name === target)
    }
    if (!kitMode) continue
    const modeId = kitMode.modeId
    const colors: { [name: string]: { r: number; g: number; b: number } } = { shadow: { r: 0, g: 0, b: 0 } }
    for (const { path, token } of leaves(doc)) {
      if (token.$type !== 'color') continue
      const v = token.$value
      colors[path.split('/').pop() || ''] = { r: num(get(v, 'components', 0)), g: num(get(v, 'components', 1)), b: num(get(v, 'components', 2)) }
    }
    setStatus(`${target} 색을 쓰는 중…`)
    for (const variable of m3vars) {
      const parts = variable.name.split('/')
      if (parts[0] !== 'Schemes' && parts[0] !== 'State Layers') continue
      const c = colors[kitRole(parts[1] || '')]
      if (!c) { missing.add(parts[1] || variable.name); continue }
      let a = 1
      if (parts[0] === 'State Layers') {
        const m = (parts[2] || '').match(/Opacity-(\d+)/)
        if (!m) continue
        a = Number(m[1]) / 100
      }
      await withFonts(() => variable.setValueForMode(modeId, { r: c.r, g: c.g, b: c.b, a }))
      if (parts[0] === 'Schemes') stats.colors++; else stats.layers++
    }
    stats.modes.push(target)
  }
  // 톤 팔레트: M3 컬렉션의 Palettes/<계열>/<톤> 변수. 밝은 팔레트는 Light 세 모드, 어두운 팔레트는 Dark 세 모드에 넣는다.
  const PALETTE_LABEL: { [group: string]: string } = { primary: 'Primary', secondary: 'Secondary', tertiary: 'Tertiary', error: 'Error', neutral: 'Neutral', 'neutral-variant': 'Neutral Variant' }
  const paletteFiles: [string, string][] = [['palette-light.tokens.json', 'Light'], ['palette-dark.tokens.json', 'Dark']]
  for (const [file, prefix] of paletteFiles) {
    const doc = parse(files, file)
    if (!doc) continue
    const modeIds = m3.modes.filter(m => m.name === prefix || m.name.startsWith(prefix + ' ')).map(m => m.modeId)
    if (!modeIds.length) continue
    setStatus(`${prefix} 톤 팔레트를 쓰는 중…`)
    for (const { path, token } of leaves(doc)) {
      if (token.$type !== 'color') continue
      const [group, tone] = path.split('/')
      const label = PALETTE_LABEL[group]
      if (!label) continue
      const name = `Palettes/${label}/${tone}`
      let variable = m3vars.find(v => v.name === name)
      if (!variable) {
        variable = figma.variables.createVariable(name, m3, 'COLOR')
        variable.scopes = ['FRAME_FILL', 'SHAPE_FILL']
        m3vars.push(variable)
      }
      const v = token.$value
      const value = { r: num(get(v, 'components', 0)), g: num(get(v, 'components', 1)), b: num(get(v, 'components', 2)), a: 1 }
      const target = variable
      for (const modeId of modeIds) await withFonts(() => target.setValueForMode(modeId, value))
      stats.palette++
    }
  }
  if (missing.size) stats.notes.push(`토큰에 없는 역할 ${missing.size}개는 그대로 뒀어요: ${Array.from(missing).slice(0, 5).join(', ')}`)

  const scale = parse(files, 'typescale.tokens.json')
  if (!isObj(scale)) return stats
  // 글꼴: Font theme의 Brand · Plain(Baseline 모드)
  const family = str(get(scale, 'font', 'sans', '$value'))
  const fontTheme = collections.find(c => c.name === 'Font theme')
  if (family && fontTheme) {
    if (!fontList) fontList = await figma.listAvailableFontsAsync()
    const styles = fontList.filter(f => f.fontName.family === family).map(f => f.fontName.style)
    if (!styles.length) {
      stats.notes.push(`'${family}' 글꼴을 이 Figma에서 찾지 못해 글꼴은 바꾸지 않았어요`)
    } else {
      setStatus('글꼴을 바꾸는 중…')
      for (const style of ['Regular', 'Medium', 'SemiBold', 'Bold']) {
        if (styles.includes(style)) { try { await figma.loadFontAsync({ family, style }) } catch (_e) { /* 아래에서 필요할 때 다시 알린다 */ } }
      }
      const base = fontTheme.modes.find(m => m.name === 'Baseline') || fontTheme.modes[0]
      for (const name of ['Static/Font/Brand', 'Static/Font/Plain']) {
        const variable = all.find(v => v.variableCollectionId === fontTheme.id && v.name === name)
        if (variable) await withFonts(() => variable.setValueForMode(base.modeId, family))
      }
      stats.font = family
    }
  }
  // 절감형 굵기: Typescale 컬렉션의 Saving-Dark · Saving-Light 모드
  const typescale = collections.find(c => c.name === 'Typescale')
  if (typescale) {
    const groups: [string, string][] = [['saving-dark', 'Saving-Dark'], ['saving-light', 'Saving-Light']]
    for (const [group, modeName] of groups) {
      const tokens = get(scale, group)
      if (!isObj(tokens)) { stats.notes.push(`토큰 묶음에 ${group} 굵기가 없어요 — 사이트에서 다시 내보내세요`); continue }
      let mode = typescale.modes.find(m => m.name === modeName)
      if (!mode) {
        try { typescale.addMode(modeName) } catch (_e) { stats.notes.push(`Typescale 컬렉션에 '${modeName}' 모드를 만들 수 없어 건너뛰었어요`); continue }
        mode = typescale.modes.find(m => m.name === modeName)
      }
      if (!mode) continue
      const modeId = mode.modeId
      setStatus(`${modeName} 굵기를 쓰는 중…`)
      for (const variable of all.filter(v => v.variableCollectionId === typescale.id)) {
        const parts = variable.name.split('/')
        const leaf = parts[parts.length - 1]
        if (leaf !== 'Weight' && leaf !== 'Weight-emphasized') continue
        const key = (parts[parts.length - 2] || '').toLowerCase().replace(/ /g, '-')
        const weight = num(get(tokens, leaf === 'Weight' ? 'baseline' : 'emphasized', key, 'weight', '$value'))
        const styleName = KIT_WEIGHT[weight]
        if (!styleName) continue
        await withFonts(() => variable.setValueForMode(modeId, styleName))
        stats.weights++
      }
    }
  }
  return stats
}

/* ─── 텍스트 스타일 ─── */

const WEIGHT_NAMES: { [w: number]: string[] } = {
  100: ['thin', 'hairline'], 200: ['extralight', 'ultralight'], 300: ['light'], 400: ['regular', 'normal', 'book'],
  500: ['medium'], 600: ['semibold', 'demibold'], 700: ['bold'], 800: ['extrabold', 'ultrabold', 'heavy'], 900: ['black', 'heavy'],
}
const norm = (s: string) => s.toLowerCase().replace(/[\s_-]/g, '')

function weightOf(style: string): number | null {
  const n = norm(style)
  for (const [w, names] of Object.entries(WEIGHT_NAMES)) if (names.includes(n)) return Number(w)
  return null
}

/** 글꼴 가족에서 굵기에 맞는 스타일 이름을 고른다. 정확히 없으면 가장 가까운 굵기. */
function pickStyle(styles: string[], weight: number): string | null {
  const upright = styles.filter(s => !/italic|oblique/i.test(s))
  const exact = upright.find(s => weightOf(s) === weight)
  if (exact) return exact
  let best: string | null = null
  let bestDiff = Infinity
  for (const s of upright) {
    const w = weightOf(s)
    if (w === null) continue
    const diff = Math.abs(w - weight)
    if (diff < bestDiff) { best = s; bestDiff = diff }
  }
  return best
}

/** 굵기에 가장 가까운 스타일부터 불러 본다. Figma가 목록에는 보여 주지만 불러오지 못하는 스타일은 건너뛴다. */
async function loadNearest(family: string, styles: string[], weight: number, loaded: Set<string>, failed: Set<string>): Promise<string | null> {
  let pool = styles.filter(s => !failed.has(s))
  while (pool.length) {
    const s = pickStyle(pool, weight)
    if (!s) return null
    if (loaded.has(s)) return s
    try { await figma.loadFontAsync({ family, style: s }); loaded.add(s); return s } catch (_e) { failed.add(s); pool = pool.filter(x => x !== s) }
  }
  return null
}

async function findVariable(name: string, preferCollection: string): Promise<Variable | null> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync()
  const preferred = collections.find(c => c.name === preferCollection)
  const all = await figma.variables.getLocalVariablesAsync()
  return all.find(v => v.name === name && preferred && v.variableCollectionId === preferred.id)
    || all.find(v => v.name === name) || null
}

async function importTextStyles(files: { [name: string]: string }) {
  const doc = parse(files, 'styles.tokens.json')
  if (!isObj(doc) || !isObj(doc.typography)) return { created: 0, updated: 0, bound: 0, notes: ['styles.tokens.json의 글자 스타일이 없어요'] }
  const notes: string[] = []
  const tokens = leaves(doc.typography)
  if (!tokens.length) return { created: 0, updated: 0, bound: 0, notes: ['글자 스타일이 비어 있어요'] }

  // 글꼴 가족: Typescale 변수 font/sans가 있으면 그 값, 없으면 토큰 값.
  const familyVar = await findVariable('font/sans', 'Typescale')
  let family = str(get(tokens[0].token, '$value', 'fontFamily'))
  if (familyVar) {
    const collection = await figma.variables.getVariableCollectionByIdAsync(familyVar.variableCollectionId)
    const value = collection ? familyVar.valuesByMode[collection.defaultModeId] : null
    if (typeof value === 'string') family = value
  }
  const fonts = await figma.listAvailableFontsAsync()
  const styles = fonts.filter(f => f.fontName.family === family).map(f => f.fontName.style)
  if (!styles.length) {
    return { created: 0, updated: 0, bound: 0, notes: [`'${family}' 글꼴을 이 Figma에서 찾지 못해 텍스트 스타일을 만들지 않았어요`] }
  }

  const local = await figma.getLocalTextStylesAsync()
  const byName = new Map(local.map(s => [s.name, s]))
  let created = 0, updated = 0, bound = 0
  const missingVars = new Set<string>()
  const loaded = new Set<string>()
  const failed = new Set<string>()

  for (const { token } of tokens) {
    const ext = extOf(token)
    const value = token.$value
    const name = str(get(ext, 'figma', 'styleName'))
    if (!name) continue
    const weight = num(get(value, 'fontWeight'))
    const styleName = await loadNearest(family, styles, weight, loaded, failed)
    if (!styleName) { notes.push(`${name}: '${family}'에 쓸 수 있는 굵기가 없어요`); continue }
    if (weightOf(styleName) !== weight) notes.push(`${name}: 굵기 ${weight} 대신 ${styleName}`)
    const exactWeight = weightOf(styleName) === weight
    const fontName = { family, style: styleName }

    let style = byName.get(name)
    if (!style) { style = figma.createTextStyle(); style.name = name; byName.set(name, style); created++ } else updated++
    style.fontName = fontName
    const size = num(get(value, 'fontSize', 'value'))
    style.fontSize = size
    style.lineHeight = { value: num(ext.lineHeightPx) || num(get(value, 'lineHeight')) * size, unit: 'PIXELS' }
    style.letterSpacing = { value: num(get(value, 'letterSpacing', 'value')), unit: 'PIXELS' }
    style.description = `${str(token.$description)}${ext.cssVar ? ` · var(${str(ext.cssVar)})` : ''}`

    for (const field of ['fontFamily', 'fontSize', 'lineHeight', 'fontWeight', 'letterSpacing'] as VariableBindableTextField[]) {
      const varName = str(get(ext, 'figma', 'variables', field))
      if (!varName) continue
      // 대신한 굵기로 만든 스타일은 굵기 변수에 묶지 않는다(묶으면 없는 굵기를 다시 찾는다).
      if (field === 'fontWeight' && !exactWeight) continue
      const variable = await findVariable(varName, 'Typescale')
      if (!variable) { missingVars.add(varName); continue }
      try { style.setBoundVariable(field, variable); bound++ } catch (e) { notes.push(`${name} ${field} 연결 실패: ${(e as Error).message || e}`) }
    }
  }
  if (missingVars.size) notes.push(`Typescale 변수 ${missingVars.size}개가 없어 값만 넣고 연결하지 못했어요 — '변수'를 켜고 다시 실행하면 연결돼요`)
  return { created, updated, bound, notes }
}

/* ─── 이펙트 스타일 ─── */

async function importEffectStyles(files: { [name: string]: string }) {
  const doc = parse(files, 'styles.tokens.json')
  if (!isObj(doc) || !isObj(doc.elevation)) return { created: 0, updated: 0 }
  const local = await figma.getLocalEffectStylesAsync()
  const byName = new Map(local.map(s => [s.name, s]))
  let created = 0, updated = 0
  for (const { token } of leaves(doc.elevation)) {
    const name = str(get(extOf(token), 'figma', 'styleName'))
    if (!name) continue
    const shadows: Json[] = Array.isArray(token.$value) ? token.$value : [token.$value]
    const effects: Effect[] = shadows.map(s => ({
      type: 'DROP_SHADOW',
      color: {
        r: num(get(s, 'color', 'components', 0)), g: num(get(s, 'color', 'components', 1)), b: num(get(s, 'color', 'components', 2)),
        a: typeof get(s, 'color', 'alpha') === 'number' ? num(get(s, 'color', 'alpha')) : 1,
      },
      offset: { x: num(get(s, 'offsetX', 'value')), y: num(get(s, 'offsetY', 'value')) },
      radius: num(get(s, 'blur', 'value')),
      spread: num(get(s, 'spread', 'value')),
      visible: true,
      blendMode: 'NORMAL',
    }))
    let style = byName.get(name)
    if (!style) { style = figma.createEffectStyle(); style.name = name; byName.set(name, style); created++ } else updated++
    style.effects = effects
    style.description = str(token.$description)
  }
  return { created, updated }
}

/* ─── 실행 ─── */

async function runImport(message: ImportMessage) {
  const summary: string[] = []
  let hadError = false
  const kit = await findKit()
  if (kit) {
    // 공식 M3 키트 사본: 키트의 변수에 넣는다. 텍스트 · 그림자 스타일과 간격 · 모서리 변수는 키트 것을 그대로 둔다.
    log('공식 M3 키트 파일로 인식했어요 — M3 색 · 글꼴 · 절감형 굵기 모드를 갱신해요')
    if (message.doVariables) {
      const r = await importKit(kit, message.files, message.colorMode)
      log(`색 모드 ${r.modes.length}개 · 역할 색 ${r.colors} · 상태 레이어 ${r.layers} · 톤 팔레트 ${r.palette}`)
      if (r.font) log(`글꼴 ${r.font}`)
      log(`절감형 굵기 ${r.weights}개 (Typescale의 Saving-Dark · Saving-Light 모드)`)
      for (const n of r.notes) log(n)
    } else {
      log('키트 파일에서는 「변수」를 켜야 갱신돼요')
    }
    if (message.doText || message.doEffects) log('텍스트 · 그림자 스타일은 키트 것을 그대로 둬요')
    setStatus('가져오기를 마쳤어요', 'ok')
    figma.ui.postMessage({ type: 'done' })
    return
  }
  if (message.doVariables) {
    const { stats, errors } = await importVariables(message.files, message.colorMode)
    summary.push(`변수 ${stats.created}개 만듦 · ${stats.updated}개 갱신`)
    for (const s of stats.skipped.slice(0, 8)) log(`건너뜀: ${s}`)
    if (stats.skipped.length > 8) log(`건너뜀 ${stats.skipped.length - 8}개 더`)
    for (const e of errors) { log(e); hadError = true }
  }
  if (message.doText) {
    setStatus('텍스트 스타일을 만드는 중…')
    const r = await importTextStyles(message.files)
    summary.push(`텍스트 스타일 ${r.created}개 만듦 · ${r.updated}개 갱신 · 변수 연결 ${r.bound}`)
    for (const n of r.notes.slice(0, 10)) log(n)
  }
  if (message.doEffects) {
    setStatus('그림자 스타일을 만드는 중…')
    const r = await importEffectStyles(message.files)
    summary.push(`그림자 스타일 ${r.created}개 만듦 · ${r.updated}개 갱신`)
  }
  for (const line of summary) log(line)
  setStatus(hadError ? '일부를 가져오지 못했어요 — 아래 기록을 확인하세요' : '가져오기를 마쳤어요', hadError ? 'error' : 'ok')
  figma.ui.postMessage({ type: 'done' })
}

figma.ui.onmessage = async (message: UiMessage) => {
  if (message.type === 'resize') {
    figma.ui.resize(PANEL_WIDTH, Math.max(120, Math.min(900, Math.round(message.height))))
    return
  }
  if (message.type === 'import') {
    try {
      await runImport(message)
    } catch (e) {
      setStatus(`가져오지 못했어요: ${(e as Error).message || e}`, 'error')
      figma.ui.postMessage({ type: 'done' })
    }
  }
}
