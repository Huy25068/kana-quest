export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const sample = <T,>(arr: readonly T[], n: number): T[] => shuffle(arr).slice(0, n)
export const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function formatTime(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Loại bỏ các chữ trùng romaji (vd じ/ぢ) để câu hỏi không có hai đáp án đúng. */
export function uniqueByRomaji<T extends { romaji: string; type: string }>(arr: readonly T[]): T[] {
  const seen = new Set<string>()
  return arr.filter((k) => {
    const key = `${k.type}:${k.romaji}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
