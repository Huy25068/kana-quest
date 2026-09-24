import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CharStat } from '../types/kana'
import { todayKey } from '../lib/utils'

export const EXP_PER_CORRECT = 10
export const WEAK_THRESHOLD = 0.6

export type GameId = 'memory' | 'falling' | 'audio' | 'builder'

interface ProgressState {
  exp: number
  streak: number
  lastActiveDate: string | null
  stats: Record<string, CharStat>
  bestScores: Partial<Record<GameId, number>>
  gamesPlayed: number
  activity: Record<string, number> // số câu trả lời theo ngày
  sfxEnabled: boolean
  theme: 'light' | 'dark'

  recordAnswer: (charId: string, correct: boolean) => void
  addExp: (amount: number) => void
  finishGame: (game: GameId, score: number, bonusExp: number) => boolean // true nếu kỷ lục mới
  toggleSfx: () => void
  toggleTheme: () => void
  resetProgress: () => void
}

const initial = {
  exp: 0,
  streak: 0,
  lastActiveDate: null,
  stats: {},
  bestScores: {},
  gamesPlayed: 0,
  activity: {},
}

/** Cập nhật streak khi có hoạt động học trong ngày. */
function touchStreak(s: Pick<ProgressState, 'streak' | 'lastActiveDate' | 'activity'>) {
  const today = todayKey()
  const activity = { ...s.activity, [today]: (s.activity[today] ?? 0) + 1 }
  if (s.lastActiveDate === today) return { activity }
  const y = new Date()
  y.setDate(y.getDate() - 1)
  const streak = s.lastActiveDate === todayKey(y) ? s.streak + 1 : 1
  return { streak, lastActiveDate: today, activity }
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initial,
      sfxEnabled: true,
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',

      recordAnswer: (charId, correct) =>
        set((s) => {
          const prev = s.stats[charId] ?? { correct: 0, incorrect: 0, lastSeen: 0 }
          return {
            stats: {
              ...s.stats,
              [charId]: {
                correct: prev.correct + (correct ? 1 : 0),
                incorrect: prev.incorrect + (correct ? 0 : 1),
                lastSeen: Date.now(),
              },
            },
            exp: s.exp + (correct ? EXP_PER_CORRECT : 0),
            ...touchStreak(s),
          }
        }),

      addExp: (amount) => set((s) => ({ exp: s.exp + amount })),

      finishGame: (game, score, bonusExp) => {
        const s = get()
        const isRecord = score > (s.bestScores[game] ?? 0)
        set({
          gamesPlayed: s.gamesPlayed + 1,
          exp: s.exp + bonusExp,
          bestScores: isRecord ? { ...s.bestScores, [game]: score } : s.bestScores,
        })
        return isRecord
      },

      toggleSfx: () => set((s) => ({ sfxEnabled: !s.sfxEnabled })),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      resetProgress: () => set({ ...initial }),
    }),
    {
      name: 'kq-progress',
      version: 2,
      // v2: bỏ hệ thống tim – xóa các trường cũ khỏi dữ liệu đã lưu.
      migrate: (persisted) => {
        const { lives, lastRegenAt, flashcardProgress, ...rest } = persisted as Record<string, unknown>
        void lives, void lastRegenAt, void flashcardProgress
        return rest as unknown as ProgressState
      },
    },
  ),
)

/* ---------------- Selectors / helpers ---------------- */

export function levelInfo(exp: number) {
  let level = 1
  let remaining = exp
  while (remaining >= level * 100) {
    remaining -= level * 100
    level++
  }
  return { level, current: remaining, needed: level * 100 }
}

export function accuracy(stat?: CharStat) {
  if (!stat) return null
  const total = stat.correct + stat.incorrect
  return total === 0 ? null : stat.correct / total
}

export const isWeak = (stat?: CharStat) => {
  const acc = accuracy(stat)
  return acc !== null && acc < WEAK_THRESHOLD
}

export const isMastered = (stat?: CharStat) => {
  const acc = accuracy(stat)
  return acc !== null && stat!.correct >= 3 && acc >= 0.8
}

/** Streak hiển thị: về 0 nếu đã bỏ lỡ quá 1 ngày. */
export function currentStreak(streak: number, lastActiveDate: string | null) {
  if (!lastActiveDate) return 0
  const y = new Date()
  y.setDate(y.getDate() - 1)
  return lastActiveDate === todayKey() || lastActiveDate === todayKey(y) ? streak : 0
}
