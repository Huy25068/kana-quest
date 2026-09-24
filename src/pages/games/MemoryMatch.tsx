import { useEffect, useRef, useState } from 'react'
import { MousePointerClick, Timer } from 'lucide-react'
import { GameShell, StartScreen } from '../../components/GameShell'
import { GameResult } from '../../components/GameResult'
import { counterpartOf } from '../../components/KanaDetail'
import { useActivePool } from '../../hooks/useActivePool'
import { useGameSession } from '../../hooks/useGameSession'
import { playSfx, speak } from '../../lib/audio'
import { cn, formatTime, sample, shuffle, uniqueByRomaji } from '../../lib/utils'
import type { KanaItem } from '../../types/kana'

type Mode = 'romaji' | 'script'
interface Card {
  uid: number
  pairKey: string
  label: string
  isKana: boolean
  kanaIds: string[]
  speakText?: string
}

function buildDeck(pool: KanaItem[], mode: Mode, pairs: number): Card[] {
  const source = mode === 'romaji' ? uniqueByRomaji(pool) : pool
  // Chế độ Hira↔Kata: mỗi cặp là một âm, bỏ trùng giữa 2 bảng chữ.
  const unique = mode === 'script' ? [...new Map(source.map((k) => [k.id.slice(5), k])).values()] : source
  const chosen = sample(unique, Math.min(pairs, unique.length))
  let uid = 0
  const cards: Card[] = chosen.flatMap((k) => {
    if (mode === 'romaji') {
      return [
        { uid: uid++, pairKey: k.id, label: k.char, isKana: true, kanaIds: [k.id], speakText: k.char },
        { uid: uid++, pairKey: k.id, label: k.romaji, isKana: false, kanaIds: [k.id] },
      ]
    }
    const other = counterpartOf(k)!
    const [h, t] = k.type === 'hiragana' ? [k, other] : [other, k]
    const key = k.id.slice(5)
    return [
      { uid: uid++, pairKey: key, label: h.char, isKana: true, kanaIds: [h.id, t.id], speakText: h.char },
      { uid: uid++, pairKey: key, label: t.char, isKana: true, kanaIds: [h.id, t.id], speakText: t.char },
    ]
  })
  return shuffle(cards)
}

export default function MemoryMatch() {
  const { pool } = useActivePool()
  const { answer, finish, reset, summary } = useGameSession('memory')
  const [mode, setMode] = useState<Mode>('romaji')
  const [size, setSize] = useState<12 | 16>(12)
  const [deck, setDeck] = useState<Card[] | null>(null)
  const [open, setOpen] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [wrongPair, setWrongPair] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [startAt, setStartAt] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const lock = useRef(false)

  const playing = deck !== null && !summary
  const pairs = deck ? deck.length / 2 : 0

  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setElapsed(Date.now() - startAt), 250)
    return () => clearInterval(t)
  }, [playing, startAt])

  const start = () => {
    reset()
    setDeck(buildDeck(pool, mode, size / 2))
    setOpen([])
    setMatched(new Set())
    setMoves(0)
    setStartAt(Date.now())
    setElapsed(0)
    lock.current = false
  }

  const exit = () => {
    reset()
    setDeck(null)
  }

  const click = (i: number) => {
    if (!deck || lock.current) return
    const card = deck[i]
    if (open.includes(i) || matched.has(card.pairKey)) return
    playSfx('flip')
    if (card.speakText) speak(card.speakText)
    const next = [...open, i]
    setOpen(next)
    if (next.length < 2) return

    setMoves((m) => m + 1)
    const [a, b] = next.map((n) => deck[n])
    lock.current = true
    if (a.pairKey === b.pairKey) {
      answer(a.kanaIds, true)
      const m = new Set(matched).add(a.pairKey)
      setTimeout(() => {
        setMatched(m)
        setOpen([])
        lock.current = false
        if (m.size === pairs) {
          const secs = Math.round((Date.now() - startAt) / 1000)
          const score = Math.max(50, pairs * 100 - Math.max(0, moves + 1 - pairs) * 10 - secs)
          finish(score, true)
        }
      }, 400)
    } else {
      playSfx('wrong')
      setWrongPair(next)
      setTimeout(() => {
        setOpen([])
        setWrongPair([])
        lock.current = false
      }, 900)
    }
  }

  const cols = 4
  return (
    <GameShell title="Lật thẻ trí nhớ" jp="神経衰弱" active={deck !== null} onExit={exit}>
      {!deck ? (
        <StartScreen
          icon="🃏"
          onStart={start}
          desc="Lật hai thẻ mỗi lượt để tìm cặp tương ứng. Hoàn thành càng nhanh, càng ít lượt thì điểm càng cao!"
        >
          <div className="space-y-4 text-left">
            <div>
              <div className="mb-2 text-sm font-bold text-sumi-500">Kiểu ghép</div>
              <div className="grid grid-cols-2 gap-2">
                {([['romaji', 'Kana ↔ Romaji', 'か ↔ ka'], ['script', 'Hiragana ↔ Katakana', 'か ↔ カ']] as const).map(([v, l, e]) => (
                  <button key={v} onClick={() => setMode(v)} className={cn('rounded-2xl border-2 p-3 text-center', mode === v ? 'border-sakura-400 bg-sakura-50 dark:bg-sakura-500/10' : 'border-sumi-200 dark:border-sumi-700')}>
                    <div className="font-bold">{l}</div>
                    <div className="font-jp text-sm text-sumi-400">{e}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-bold text-sumi-500">Kích thước lưới</div>
              <div className="grid grid-cols-2 gap-2">
                {([12, 16] as const).map((s) => (
                  <button key={s} onClick={() => setSize(s)} className={cn('rounded-2xl border-2 p-3 font-bold', size === s ? 'border-sakura-400 bg-sakura-50 dark:bg-sakura-500/10' : 'border-sumi-200 dark:border-sumi-700')}>
                    {s === 12 ? '3 × 4' : '4 × 4'} <span className="text-sm font-medium text-sumi-400">({s / 2} cặp)</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </StartScreen>
      ) : (
        <div className="mx-auto max-w-xl">
          <div className="mb-4 flex items-center justify-center gap-6 text-sm font-bold">
            <span className="flex items-center gap-1.5"><Timer className="size-4 text-sora-500" /> <span className="tabular-nums">{formatTime(elapsed)}</span></span>
            <span className="flex items-center gap-1.5"><MousePointerClick className="size-4 text-sakura-500" /> {moves} lượt</span>
            <span>{matched.size}/{pairs} cặp</span>
          </div>
          <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {deck.map((c, i) => {
              const isOpen = open.includes(i) || matched.has(c.pairKey)
              const done = matched.has(c.pairKey)
              return (
                <button key={c.uid} onClick={() => click(i)} className="perspective aspect-[3/4]" aria-label={isOpen ? c.label : 'Thẻ úp'}>
                  <div className={cn('preserve-3d relative h-full w-full transition-transform duration-500', isOpen && 'rotate-y-180', wrongPair.includes(i) && 'animate-shake')}>
                    <div className="face backface-hidden absolute inset-0 grid place-items-center bg-gradient-to-br from-sakura-300 to-fuji-300 text-white dark:from-sakura-500/70 dark:to-fuji-500/70">
                      <span className="font-jp text-3xl opacity-80">?</span>
                    </div>
                    <div
                      className={cn(
                        'face backface-hidden rotate-y-180 absolute inset-0 grid place-items-center bg-white dark:bg-sumi-800',
                        done && 'border-matcha-400 bg-matcha-50 dark:bg-matcha-500/15',
                        wrongPair.includes(i) && 'border-sakura-400 bg-sakura-50 dark:bg-sakura-500/15',
                      )}
                    >
                      <span className={cn(c.isKana ? 'font-jp text-3xl font-bold sm:text-5xl' : 'text-xl font-extrabold text-sora-500 sm:text-2xl')}>{c.label}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="mt-5 text-center">
            <button className="btn-secondary" onClick={exit}>Đổi chế độ</button>
          </div>
        </div>
      )}

      <GameResult
        summary={summary}
        onReplay={start}
        stats={[
          { label: 'Điểm', value: summary?.score ?? 0 },
          { label: 'Thời gian', value: formatTime(elapsed) },
          { label: 'Số lượt', value: moves },
          { label: 'Số cặp', value: pairs },
        ]}
      />
    </GameShell>
  )
}
