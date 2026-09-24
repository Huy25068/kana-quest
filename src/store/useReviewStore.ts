import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ReviewSource = 'manual' | 'flashcard' | 'game'

export interface ReviewItem {
  addedAt: number
  source: ReviewSource
}

interface ReviewState {
  /** Sổ hay quên: charId → thông tin thêm vào. */
  items: Record<string, ReviewItem>
  add: (ids: string | string[], source?: ReviewSource) => number // trả về số chữ mới được thêm
  remove: (id: string) => void
  toggle: (id: string) => boolean // true nếu vừa thêm
  clear: () => void
}

export const useReviewStore = create<ReviewState>()(
  persist(
    (set, get) => ({
      items: {},
      add: (ids, source = 'manual') => {
        const list = (Array.isArray(ids) ? ids : [ids]).filter((id) => !get().items[id])
        if (!list.length) return 0
        const now = Date.now()
        set((s) => ({ items: { ...s.items, ...Object.fromEntries(list.map((id) => [id, { addedAt: now, source }])) } }))
        return list.length
      },
      remove: (id) =>
        set((s) => {
          const items = { ...s.items }
          delete items[id]
          return { items }
        }),
      toggle: (id) => {
        if (get().items[id]) {
          get().remove(id)
          return false
        }
        get().add(id)
        return true
      },
      clear: () => set({ items: {} }),
    }),
    { name: 'kq-review', version: 1 },
  ),
)

export const useInReview = (id?: string) => useReviewStore((s) => !!(id && s.items[id]))
