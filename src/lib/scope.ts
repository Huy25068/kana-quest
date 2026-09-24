import type { CharStat, KanaItem, ScopeConfig } from '../types/kana'
import { ALL_KANA } from '../data/kana'
import { isWeak } from '../store/useProgressStore'

export const MIN_POOL_SIZE = 4

/** Core engine: áp dụng ScopeConfig lên toàn bộ dữ liệu Kana. */
export function buildKanaPool(config: ScopeConfig, stats: Record<string, CharStat>, reviewIds: Set<string> = new Set()): KanaItem[] {
  // Chế độ Sổ hay quên: lấy đúng các chữ trong sổ, không phụ thuộc bảng chữ / nhóm âm / hàng.
  if (config.onlyReviewList) return ALL_KANA.filter((k) => reviewIds.has(k.id))
  const rows = new Set(config.selectedRows)
  return ALL_KANA.filter(
    (k) =>
      config.scripts.includes(k.type) &&
      config.categories[k.category] &&
      rows.has(k.row) &&
      (!config.onlyMistakes || isWeak(stats[k.id])),
  )
}
