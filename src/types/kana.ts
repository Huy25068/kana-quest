export type Script = 'hiragana' | 'katakana'
export type KanaCategory = 'seion' | 'dakuon' | 'handakuon' | 'yoon'

export interface ExampleWord {
  kanji?: string
  kana: string
  romaji: string
  meaningVi: string
}

export interface KanaItem {
  id: string // vd: 'hira_ka', 'kata_ga'
  char: string // 'か' hoặc 'カ'
  romaji: string // 'ka'
  type: Script
  category: KanaCategory
  row: string // 'a', 'ka', 'sa', 'ta'...
  audioUrl?: string
  mnemonicHint: string
  exampleWord?: ExampleWord
}

export interface ScopeConfig {
  scripts: Script[]
  categories: Record<KanaCategory, boolean>
  selectedRows: string[]
  onlyMistakes: boolean // Chỉ lấy chữ có tỷ lệ đúng < 60%
}

export interface CharStat {
  correct: number
  incorrect: number
  lastSeen: number
}

export interface RowDef {
  id: string
  label: string
  category: KanaCategory
}

export interface WordEntry {
  id: string
  script: Script
  tokens: string[] // từng khối kana, vd ['さ','く','ら'] hoặc ['お','ちゃ']
  romaji: string
  meaningVi: string
  kanji?: string
}
