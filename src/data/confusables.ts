import type { KanaItem } from '../types/kana'
import { KANA_BY_CHAR } from './kana'

/** Các nhóm chữ có hình dáng dễ nhầm với nhau. */
// prettier-ignore
const GROUPS: string[][] = [
  // Hiragana
  ['あ', 'お', 'め', 'ぬ'], ['ぬ', 'め', 'ね'], ['ね', 'れ', 'わ'], ['る', 'ろ'], ['は', 'ほ', 'け'],
  ['さ', 'き', 'ち'], ['ち', 'ら', 'う'], ['こ', 'に', 'た'], ['い', 'り', 'こ'], ['く', 'へ', 'し'],
  ['つ', 'う', 'し'], ['ま', 'も', 'ほ'], ['な', 'た'], ['そ', 'て', 'ろ'], ['す', 'お', 'む'],
  ['ば', 'ぱ'], ['び', 'ぴ'], ['ぶ', 'ぷ'], ['べ', 'ぺ'], ['ぼ', 'ぽ'], ['じ', 'ぢ'], ['ず', 'づ'],
  ['ゆ', 'よ'], ['ん', 'え'],
  // Katakana
  ['シ', 'ツ', 'ソ', 'ン'], ['ソ', 'ン', 'リ'], ['ク', 'ケ', 'タ', 'ワ'], ['ウ', 'ワ', 'フ', 'ヲ'],
  ['コ', 'ユ', 'ヨ', 'ロ'], ['チ', 'テ', 'ナ'], ['マ', 'ア', 'ム'], ['ヌ', 'ス', 'フ'], ['セ', 'ヤ', 'サ'],
  ['メ', 'ナ', 'ノ'], ['ハ', 'ル', 'ニ'], ['エ', 'ユ', 'コ'], ['ヒ', 'ビ', 'ピ'],
  ['シ', 'ジ'], ['ツ', 'ヅ'], ['ホ', 'ボ', 'ポ'], ['オ', 'ホ', 'キ'], ['レ', 'ン', 'ル'], ['ラ', 'ヲ', 'フ'],
  // Ảo âm
  ['きゃ', 'きゅ', 'きょ'], ['しゃ', 'しゅ', 'しょ'], ['ちゃ', 'ちゅ', 'ちょ'], ['シャ', 'シュ', 'ショ'], ['ツ', 'シ'],
]

const SIMILAR = new Map<string, Set<string>>()
for (const g of GROUPS) {
  for (const a of g) {
    if (!SIMILAR.has(a)) SIMILAR.set(a, new Set())
    for (const b of g) if (a !== b) SIMILAR.get(a)!.add(b)
  }
}

/** Các KanaItem trông giống `k` (cùng bảng chữ). */
export function similarTo(k: KanaItem): KanaItem[] {
  return [...(SIMILAR.get(k.char) ?? [])]
    .map((c) => KANA_BY_CHAR.get(c))
    .filter((x): x is KanaItem => !!x && x.type === k.type && x.romaji !== k.romaji)
}
