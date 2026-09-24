import { useCallback, useEffect, useState } from 'react'
import { Ear, Snail, TriangleAlert, Volume2 } from 'lucide-react'
import { GameShell, StartScreen } from '../../components/GameShell'
import { GameResult } from '../../components/GameResult'
import { ALL_KANA } from '../../data/kana'
import { useActivePool } from '../../hooks/useActivePool'
import { useGameSession } from '../../hooks/useGameSession'
import { hasJapaneseVoice, speak } from '../../lib/audio'
import { cn, sample, shuffle, uniqueByRomaji } from '../../lib/utils'
import type { KanaItem } from '../../types/kana'

const TOTAL = 10

interface Question {
  target: KanaItem
  options: KanaItem[]
}

/** Phương án gây nhiễu: ưu tiên cùng bảng chữ + cùng nhóm âm, khác cách đọc. */
function distractorsFor(target: KanaItem, pool: KanaItem[]): KanaItem[] {
  const differs = (k: KanaItem) => k.romaji !== target.romaji
  const tiers = [
    pool.filter((k) => differs(k) && k.type === target.type && k.category === target.category),
    ALL_KANA.filter((k) => differs(k) && k.type === target.type && k.category === target.category),
    pool.filter((k) => differs(k) && k.type === target.type),
    ALL_KANA.filter((k) => differs(k) && k.type === target.type),
  ]
  const picked: KanaItem[] = []
  const used = new Set<string>([target.romaji])
  for (const tier of tiers) {
    for (const k of shuffle(tier)) {
      if (picked.length === 3) return picked
      if (!used.has(k.romaji)) {
        used.add(k.romaji)
        picked.push(k)
      }
    }
  }
  return picked
}

function buildQuiz(pool: KanaItem[]): Question[] {
  const targets = uniqueByRomaji(pool)
  const list: KanaItem[] = []
  while (list.length < TOTAL) list.push(...sample(targets, Math.min(TOTAL - list.length, targets.length)))
  return list.map((target) => ({ target, options: shuffle([target, ...distractorsFor(target, pool)]) }))
}

export default function AudioQuiz() {
  const { pool } = useActivePool()
  const { answer, finish, reset, summary, missed } = useGameSession('audio')
  const [quiz, setQuiz] = useState<Question[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)
  const [streak, setStreak] = useState(0)
  const [score, setScore] = useState(0)
  const [voiceOk] = useState(hasJapaneseVoice)

  const q = quiz?.[idx]

  const play = useCallback((rate = 0.8) => q && speak(q.target.char, { audioUrl: q.target.audioUrl, rate }), [q])

  // Tự động phát âm khi sang câu mới
  useEffect(() => {
    if (!q || summary) return
    const t = setTimeout(() => play(), 300)
    return () => clearTimeout(t)
  }, [q, play, summary])

  const start = () => {
    reset()
    setQuiz(buildQuiz(pool))
    setIdx(0)
    setPicked(null)
    setCorrect(0)
    setStreak(0)
    setScore(0)
  }

  const exit = () => {
    window.speechSynthesis?.cancel()
    reset()
    setQuiz(null)
  }

  const choose = useCallback(
    (k: KanaItem) => {
      if (!q || picked || summary) return
      const ok = k.id === q.target.id
      setPicked(k.id)
      answer(q.target.id, ok)
      const nextCorrect = correct + (ok ? 1 : 0)
      const nextScore = score + (ok ? 100 + streak * 10 : 0)
      setCorrect(nextCorrect)
      setScore(nextScore)
      setStreak(ok ? streak + 1 : 0)
      setTimeout(
        () => {
          if (idx + 1 >= TOTAL) return finish(nextScore, nextCorrect >= TOTAL * 0.7)
          setIdx(idx + 1)
          setPicked(null)
        },
        ok ? 800 : 1500,
      )
    },
    [q, picked, summary, answer, correct, score, streak, idx, finish],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q) return
      const n = Number(e.key)
      if (n >= 1 && n <= q.options.length) choose(q.options[n - 1])
      else if (e.key.toLowerCase() === 'r') play()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [q, choose, play])

  return (
    <GameShell title="Thử thách thính giác" jp="聞き取り" active={quiz !== null} onExit={exit}>
      {!quiz ? (
        <StartScreen
          icon="🎧"
          onStart={start}
          desc={
            <>
              Nghe phát âm và chọn đúng mặt chữ trong 4 phương án. Các phương án nhiễu được chọn <b>cùng nhóm âm</b> để thử
              thách phản xạ. {TOTAL} câu – đúng ≥ 70% để chiến thắng.
            </>
          }
        >
          {!voiceOk && (
            <div className="flex gap-2 rounded-2xl bg-yuzu-50 p-3 text-left text-sm text-sumi-600 dark:bg-yuzu-500/10 dark:text-sumi-300">
              <TriangleAlert className="size-5 shrink-0 text-yuzu-500" />
              Trình duyệt chưa có giọng đọc tiếng Nhật. Hãy dùng Chrome/Edge hoặc cài gói giọng Nhật (ja-JP) trong hệ điều hành để nghe chuẩn nhất.
            </div>
          )}
        </StartScreen>
      ) : (
        q && (
          <div className="mx-auto max-w-xl">
            <div className="mb-2 flex justify-between text-sm font-semibold text-sumi-500">
              <span>Câu {idx + 1}/{TOTAL}</span>
              <span className="tabular-nums">Điểm: {score}{streak > 1 && <span className="ml-2 text-yuzu-500">🔥 {streak}</span>}</span>
            </div>
            <div className="mb-6 h-2 overflow-hidden rounded-full bg-sumi-100 dark:bg-sumi-800">
              <div className="h-full rounded-full bg-sora-400 transition-all" style={{ width: `${(idx / TOTAL) * 100}%` }} />
            </div>

            <div className="card flex flex-col items-center p-8">
              <button
                onClick={() => play()}
                className="grid size-28 place-items-center rounded-full bg-gradient-to-br from-sora-300 to-sora-500 text-white shadow-[0_6px_0_var(--color-sora-600)] transition active:translate-y-1 active:shadow-none"
                aria-label="Phát lại âm thanh"
              >
                <Volume2 className="size-12" />
              </button>
              <div className="mt-4 flex gap-2">
                <button onClick={() => play()} className="chip border-sumi-200 dark:border-sumi-700"><Ear className="size-4" /> Nghe lại (R)</button>
                <button onClick={() => play(0.5)} className="chip border-sumi-200 dark:border-sumi-700"><Snail className="size-4" /> Chậm</button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {q.options.map((o, i) => {
                const isTarget = o.id === q.target.id
                const state = picked ? (isTarget ? 'right' : picked === o.id ? 'wrong' : 'dim') : 'idle'
                return (
                  <button
                    key={o.id}
                    onClick={() => choose(o)}
                    className={cn(
                      'relative rounded-3xl border-2 py-6 font-jp text-5xl font-bold transition active:scale-95',
                      state === 'idle' && 'border-sumi-200 bg-white hover:border-sora-300 dark:border-sumi-700 dark:bg-sumi-800',
                      state === 'right' && 'animate-pop border-matcha-400 bg-matcha-50 text-matcha-600 dark:bg-matcha-500/15',
                      state === 'wrong' && 'animate-shake border-sakura-400 bg-sakura-50 text-sakura-600 dark:bg-sakura-500/15',
                      state === 'dim' && 'border-sumi-200 opacity-40 dark:border-sumi-700',
                    )}
                  >
                    <span className="absolute top-2 left-3 font-sans text-xs font-bold text-sumi-300">{i + 1}</span>
                    {o.char}
                    {picked && <span className="mt-1 block font-sans text-sm font-semibold text-sumi-400">{o.romaji}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )
      )}

      <GameResult
        summary={summary}
        onReplay={start}
        missed={missed}
        reason={summary && !summary.won ? 'Cần đúng ít nhất 70% để chiến thắng.' : undefined}
        stats={[
          { label: 'Điểm', value: score },
          { label: 'Trả lời đúng', value: `${correct}/${TOTAL}` },
          { label: 'Độ chính xác', value: `${Math.round((correct / Math.max(1, idx + 1)) * 100)}%` },
          { label: 'Trả lời sai', value: TOTAL - correct },
        ]}
      />
    </GameShell>
  )
}
