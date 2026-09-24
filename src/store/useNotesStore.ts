import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const NOTE_COLORS = ['sakura', 'matcha', 'sora', 'yuzu', 'fuji', 'sumi'] as const
export type NoteColor = (typeof NOTE_COLORS)[number]

export interface Note {
  id: string
  title: string
  content: string
  color: NoteColor
  pinned: boolean
  createdAt: number
  updatedAt: number
}

interface NotesState {
  notes: Note[]
  addNote: (init?: Partial<Pick<Note, 'title' | 'content'>>) => string
  updateNote: (id: string, patch: Partial<Pick<Note, 'title' | 'content' | 'color'>>) => void
  togglePin: (id: string) => void
  removeNote: (id: string) => void
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: [],
      addNote: (init = {}) => {
        const now = Date.now()
        const id = `note_${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`
        const note: Note = { id, title: '', content: '', color: 'sakura', pinned: false, createdAt: now, updatedAt: now, ...init }
        set((s) => ({ notes: [note, ...s.notes] }))
        return id
      },
      updateNote: (id, patch) =>
        set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)) })),
      togglePin: (id) => set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)) })),
      removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
    }),
    { name: 'kq-notes', version: 1 },
  ),
)
