import type { CharStat, KanaItem, ScopeConfig } from '../types/kana'
import { ALL_KANA } from '../data/kana'
import { isWeak } from '../store/useProgressStore'

export const MIN_POOL_SIZE = 4

/** Core engine: áp dụng ScopeConfig lên toàn bộ dữ liệu Kana. */
export function buildKanaPool(config: ScopeConfig, stats: Record<string, CharStat>): KanaItem[] {
  const rows = new Set(config.selectedRows)
  return ALL_KANA.filter(
    (k) =>
      config.scripts.includes(k.type) &&
      config.categories[k.category] &&
      rows.has(k.row) &&
      (!config.onlyMistakes || isWeak(stats[k.id])),
  )
}
