import type { KanaItem } from '../types/kana'
import { ALL_KANA, KANA_BY_CHAR, KANA_BY_ID } from '../data/kana'
import { HELPER_TOKENS, WORDS } from '../data/words'
import { similarTo } from '../data/confusables'
import { shuffle } from './utils'

/**
 * Luật chém của Kana Ninja.
 * Nguyên tắc: luật phải kiểm tra KIẾN THỨC ĐỌC CHỮ, không để lộ đáp án qua hình dáng
 * (vd "chém biến âm" chỉ cần nhìn dấu ゛ nên đã bỏ) và nhãn luật không liệt kê mặt chữ đáp án.
 */
export type RuleKind = 'sound' | 'consonant' | 'vowel' | 'word' | 'counterpart' | 'script'

export interface Rule {
  kind: RuleKind
  label: string
  good: KanaItem[] // chữ cần chém
  bad: KanaItem[] // chữ gây nhiễu (ưu tiên dễ nhầm)
  test: (k: KanaItem) => boolean
}

const CONSONANT: Record<string, string> = {
  ka: 'k', sa: 's', ta: 't', na: 'n', ha: 'h', ma: 'm', ya: 'y', ra: 'r', wa: 'w',
  ga: 'g', za: 'z', da: 'd', ba: 'b', pa: 'p',
  kya: 'ky', sha: 'sh', cha: 'ch', nya: 'ny', hya: 'hy', mya: 'my', rya: 'ry', gya: 'gy', ja: 'j', bya: 'by', pya: 'py',
}

const counterpart = (k: KanaItem) =>
  KANA_BY_ID.get(k.type === 'hiragana' ? k.id.replace('hira_', 'kata_') : k.id.replace('kata_', 'hira_'))

/**
 * Chữ gây nhiễu cho một luật: chữ trông giống chữ đúng → cùng hàng/cùng nguyên âm trong pool → phần còn lại của pool.
 * Luôn loại chữ thỏa luật và chữ trùng cách đọc với chữ đúng (tránh "đúng mà bị tính sai").
 */
function distractors(good: KanaItem[], pool: KanaItem[], test: (k: KanaItem) => boolean, sameSoundOk = false, max = 10): KanaItem[] {
  const goodRomaji = new Set(good.map((k) => k.romaji))
  const ok = (k: KanaItem) => !test(k) && (sameSoundOk || !goodRomaji.has(k.romaji))
  const scripts = new Set(good.map((k) => k.type))
  const similar = good.flatMap(similarTo)
  const nearby = pool.filter((k) => good.some((g) => g.row === k.row || g.romaji.at(-1) === k.romaji.at(-1)))
  const sameScriptPool = pool.filter((k) => scripts.has(k.type))
  const out: KanaItem[] = []
  for (const tier of [similar, nearby, sameScriptPool, pool])
    for (const k of shuffle(tier)) {
      if (out.length >= max) return out
      if (ok(k) && !out.some((o) => o.id === k.id)) out.push(k)
    }
  return out
}

function makeRule(kind: RuleKind, label: string, good: KanaItem[], pool: KanaItem[], test: (k: KanaItem) => boolean): Rule | null {
  // Luật phân biệt bảng chữ: chữ cùng âm ở bảng kia (か/カ) chính là chữ gây nhiễu hợp lệ.
  const bad = distractors(good, pool, test, kind === 'script')
  return good.length && bad.length ? { kind, label, good, bad, test } : null
}

/** Sinh tất cả luật hợp lệ cho pool hiện tại, nhóm theo kiểu. */
export function buildRules(pool: KanaItem[]): Record<RuleKind, Rule[]> {
  const rules: Record<RuleKind, Rule[]> = { sound: [], consonant: [], vowel: [], word: [], counterpart: [], script: [] }
  const push = (r: Rule | null) => r && rules[r.kind].push(r)

  // 1. Nghe cách đọc → tìm mặt chữ (gây nhiễu bằng chữ trông giống).
  for (const k of shuffle(pool).slice(0, 8)) {
    const good = pool.filter((x) => x.romaji === k.romaji)
    push(makeRule('sound', `Chém chữ đọc là “${k.romaji}”`, good, pool, (x) => x.romaji === k.romaji))
  }

  // 2. Cùng phụ âm (hàng) – nhãn chỉ ghi romaji, không lộ mặt chữ.
  const rows = new Map<string, KanaItem[]>()
  for (const k of pool) rows.set(k.row, [...(rows.get(k.row) ?? []), k])
  for (const [row, ks] of rows) {
    if (ks.length < 2 || ks.length === pool.length) continue
    const romajis = [...new Set(ks.map((k) => k.romaji))].join(', ')
    const label = row === 'a' ? `Chém các nguyên âm (${romajis})` : CONSONANT[row] ? `Chém chữ có phụ âm “${CONSONANT[row]}-” (${romajis})` : null
    if (label) push(makeRule('consonant', label, ks, pool, (x) => x.row === row))
  }

  // 3. Cùng nguyên âm cuối.
  for (const v of ['a', 'i', 'u', 'e', 'o']) {
    const test = (x: KanaItem) => x.romaji !== 'n' && x.romaji.endsWith(v)
    const good = pool.filter(test)
    if (good.length >= 2 && good.length < pool.length) push(makeRule('vowel', `Chém chữ có âm cuối “-${v}”`, good, pool, test))
  }

  // 4. Ghép thành từ: chém các chữ tạo nên một từ vựng (chỉ cho biết romaji + nghĩa).
  const inPool = new Set(pool.map((k) => k.char))
  const scripts = new Set(pool.map((k) => k.type))
  const words = WORDS.filter((w) => scripts.has(w.script))
    .map((w) => {
      const tokens = [...new Set(w.tokens.filter((t) => !HELPER_TOKENS.has(t)))]
      const cover = tokens.filter((t) => inPool.has(t)).length / tokens.length
      return { w, tokens, cover }
    })
    .filter((x) => x.tokens.length >= 2 && x.tokens.every((t) => KANA_BY_CHAR.has(t)) && x.cover >= 0.5)
    .sort((a, b) => b.cover - a.cover)
  for (const { w, tokens } of words.slice(0, 12)) {
    const good = tokens.map((t) => KANA_BY_CHAR.get(t)!)
    const ids = new Set(good.map((k) => k.id))
    push(makeRule('word', `Chém các chữ ghép thành từ “${w.romaji}” – ${w.meaningVi.toLowerCase()}`, good, pool, (x) => ids.has(x.id)))
  }

  // 5. Hiragana ↔ Katakana: cho một chữ, chém chữ cùng âm ở bảng chữ còn lại (chỉ khi đang học cả hai bảng).
  for (const k of scripts.size > 1 ? shuffle(pool).slice(0, 8) : []) {
    const other = counterpart(k)
    if (!other) continue
    const sameScriptPeers = ALL_KANA.filter((x) => x.type === other.type && x.category === other.category)
    const r = makeRule(
      'counterpart',
      `Chém chữ ${other.type === 'katakana' ? 'Katakana' : 'Hiragana'} đọc giống “${k.char}”`,
      [other],
      [...pool.filter((x) => x.type === other.type), ...sameScriptPeers],
      (x) => x.id === other.id,
    )
    push(r)
  }

  // 6. Phân biệt bảng chữ – chỉ khi đang học cả hai.
  if (scripts.size > 1)
    for (const t of ['hiragana', 'katakana'] as const) {
      const good = pool.filter((k) => k.type === t)
      push(makeRule('script', `Chỉ chém chữ ${t === 'hiragana' ? 'Hiragana' : 'Katakana'} – bỏ qua bảng còn lại`, good, pool, (x) => x.type === t))
    }

  return rules
}

/** Chọn luật tiếp theo: khác KIỂU với luật trước để ván chơi đa dạng; ưu tiên kiểu chưa dùng. */
export function nextRule(all: Record<RuleKind, Rule[]>, usedKinds: RuleKind[]): Rule {
  const kinds = (Object.keys(all) as RuleKind[]).filter((k) => all[k].length)
  const last = usedKinds[usedKinds.length - 1]
  const fresh = kinds.filter((k) => !usedKinds.includes(k))
  const options = fresh.length ? fresh : kinds.filter((k) => k !== last)
  const kind = shuffle(options.length ? options : kinds)[0]
  return shuffle(all[kind])[0]
}
