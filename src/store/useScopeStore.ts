import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { KanaCategory, ScopeConfig, Script } from '../types/kana'
import { ALL_ROW_IDS, ROWS } from '../data/kana'

interface ScopeState {
  config: ScopeConfig
  setScripts: (scripts: Script[]) => void
  toggleCategory: (c: KanaCategory) => void
  toggleRow: (row: string) => void
  setRows: (rows: string[], on: boolean) => void
  setOnlyMistakes: (v: boolean) => void
  reset: () => void
}

export const DEFAULT_SCOPE: ScopeConfig = {
  scripts: ['hiragana'],
  categories: { seion: true, dakuon: false, handakuon: false, yoon: false },
  selectedRows: ROWS.filter((r) => r.category === 'seion').map((r) => r.id),
  onlyMistakes: false,
}

const update = (fn: (c: ScopeConfig) => Partial<ScopeConfig>) => (s: ScopeState) => ({
  config: { ...s.config, ...fn(s.config) },
})

export const useScopeStore = create<ScopeState>()(
  persist(
    (set) => ({
      config: DEFAULT_SCOPE,
      setScripts: (scripts) => set(update(() => ({ scripts }))),
      toggleCategory: (cat) =>
        set(
          update((c) => {
            const on = !c.categories[cat]
            const rowsOfCat = ROWS.filter((r) => r.category === cat).map((r) => r.id)
            // Bật nhóm → tự chọn toàn bộ hàng của nhóm cho tiện.
            const selectedRows = on ? [...new Set([...c.selectedRows, ...rowsOfCat])] : c.selectedRows
            return { categories: { ...c.categories, [cat]: on }, selectedRows }
          }),
        ),
      toggleRow: (row) =>
        set(
          update((c) => ({
            selectedRows: c.selectedRows.includes(row)
              ? c.selectedRows.filter((r) => r !== row)
              : [...c.selectedRows, row],
          })),
        ),
      setRows: (rows, on) =>
        set(
          update((c) => ({
            selectedRows: on
              ? [...new Set([...c.selectedRows, ...rows])]
              : c.selectedRows.filter((r) => !rows.includes(r)),
          })),
        ),
      setOnlyMistakes: (onlyMistakes) => set(update(() => ({ onlyMistakes }))),
      reset: () => set({ config: DEFAULT_SCOPE }),
    }),
    { name: 'kq-scope', version: 1 },
  ),
)

export { ALL_ROW_IDS }
