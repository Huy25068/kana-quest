import { useCallback, useEffect, useRef, useState } from 'react'
import { Timer, Volume2, VolumeX, Zap } from 'lucide-react'
import { GameShell, StartScreen } from '../../components/GameShell'
import { GameResult } from '../../components/GameResult'
import { similarTo } from '../../data/confusables'
import { useActivePool } from '../../hooks/useActivePool'
import { useGameSession } from '../../hooks/useGameSession'
import { playSfx, speak } from '../../lib/audio'
import { cn, pick, sample, shuffle, uniqueByRomaji } from '../../lib/utils'
import type { KanaItem } from '../../types/kana'

const ROUND_MS = 60_000
const PENALTY_MS = 3_000 // đập nhầm → trừ 3 giây (thay cho mất tim)

interface Mole {
  uid: number
  kana: KanaItem
  correct: boolean
  downAt: number // thời điểm tự thụt xuống
  status: 'up' | 'hit' | 'wrong'
}

/**
 * Chữ gây nhiễu, ưu tiên theo thứ tự:
 * giống hình dáng (trong pool) → cùng hàng (trong pool) → giống hình dáng (ngoài pool) → ngẫu nhiên trong pool.
 */
function distractors(target: KanaItem, pool: KanaItem[], n: number): KanaItem[] {
  const ok = (k: KanaItem) => k.romaji !== target.romaji
  const inPool = new Set(pool.map((k) => k.id))
  const similar = similarTo(target)
  const tiers = [
    similar.filter((k) => inPool.has(k.id)),
    pool.filter((k) => ok(k) && k.row === target.row),
    similar,
    pool.filter(ok),
  ]
  const out: KanaItem[] = []
  const used = new Set([target.romaji])
  for (const tier of tiers)
    for (const k of shuffle(tier)) {
      if (out.length === n) return out
      if (!used.has(k.romaji)) {
        used.add(k.romaji)
        out.push(k)
      }
    }
  return out
}

export default function KanaWhackAMole() {
  const { pool } = useActivePool()
  const { answer, finish, reset, summary, missed } = useGameSession('whack')
  const [running, setRunning] = useState(false)
  const [holes, setHoles] = useState<(Mole | null)[]>(Array(9).fill(null))
  const [target, setTarget] = useState<KanaItem | null>(null)
  const [timeLeft, setTimeLeft] = useState(ROUND_MS)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [hits, setHits] = useState(0)
  const [wrongs, setWrongs] = useState(0)
  const [misses, setMisses] = useState(0)
  const [hammer, setHammer] = useState<number | null>(null)
  const [shake, setShake] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [autoSpeak, setAutoSpeak] = useState(false)
  const [wrongCount, setWrongCount] = useState<Record<string, number>>({})

  const g = useRef({
    pool: [] as KanaItem[],
    endAt: 0,
    nextRoundAt: 0,
    roundOpen: false,
    target: null as KanaItem | null,
    hits: 0,
    combo: 0,
    uid: 0,
  })
  const holesRef = useRef(holes)
  holesRef.current = holes
  const autoSpeakRef = useRef(autoSpeak)
  autoSpeakRef.current = autoSpeak

  const multiplier = Math.min(4, 1 + Math.floor(combo / 5))

  const breakCombo = () => {
    g.current.combo = 0
    setCombo(0)
  }

  /* ---------- Bắt đầu một lượt: 2–3 chuột, 1 đúng ---------- */
  const spawnRound = useCallback((now: number) => {
    const s = g.current
    const prev = s.target
    const choices = s.pool.length > 1 ? s.pool.filter((k) => k.romaji !== prev?.romaji) : s.pool
    const t = pick(choices)
    const count = Math.random() < 0.5 ? 2 : 3
    const kanas = shuffle([t, ...distractors(t, s.pool, count - 1)])
    const slots = sample([0, 1, 2, 3, 4, 5, 6, 7, 8], kanas.length)
    const upMs = Math.max(1000, 1500 - s.hits * 12)
    const next: (Mole | null)[] = Array(9).fill(null)
    kanas.forEach((k, i) => {
      next[slots[i]] = { uid: s.uid++, kana: k, correct: k.id === t.id, downAt: now + upMs, status: 'up' }
    })
    s.target = t
    s.roundOpen = true
    setTarget(t)
    setHoles(next)
    if (autoSpeakRef.current) speak(t.char, { audioUrl: t.audioUrl })
  }, [])

  const closeRound = (now: number, gap: number) => {
    const s = g.current
    s.roundOpen = false
    // Chu kỳ 1.2s → 2s, nhanh dần theo số lần đập trúng.
    const cycle = Math.max(1200, 2000 - s.hits * 30)
    s.nextRoundAt = now + Math.max(gap, cycle - 1500)
  }

  /* ---------- Vòng lặp (100ms) ---------- */
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      const now = performance.now()
      const s = g.current
      const left = s.endAt - now
      setTimeLeft(Math.max(0, left))
      if (left <= 0) return

      if (!s.roundOpen && now >= s.nextRoundAt) spawnRound(now)

      // Chuột hết giờ → thụt xuống.
      const cur = holesRef.current
      if (s.roundOpen && cur.some((m) => m && m.status === 'up' && now >= m.downAt)) {
        const correctMissed = cur.some((m) => m && m.correct && m.status === 'up')
        if (correctMissed) {
          setMisses((m) => m + 1)
          breakCombo()
        }
        setHoles(Array(9).fill(null))
        closeRound(now, 250)
      }
    }, 100)
    return () => clearInterval(t)
  }, [running, spawnRound])

  /* ---------- Kết thúc ---------- */
  useEffect(() => {
    if (running && timeLeft <= 0) {
      setRunning(false)
      setHoles(Array(9).fill(null))
      finish(score, hits >= 8 && hits > wrongs + misses)
    }
  }, [running, timeLeft, finish, score, hits, wrongs, misses])

  const start = () => {
    reset()
    const s = g.current
    const now = performance.now()
    Object.assign(s, { pool: uniqueByRomaji(pool), endAt: now + ROUND_MS, nextRoundAt: now + 600, roundOpen: false, target: null, hits: 0, combo: 0 })
    setHoles(Array(9).fill(null))
    setTarget(null)
    setTimeLeft(ROUND_MS)
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setHits(0)
    setWrongs(0)
    setMisses(0)
    setWrongCount({})
    setRunning(true)
  }

  const exit = () => {
    setRunning(false)
    setHoles(Array(9).fill(null))
    reset()
  }

  const whack = (i: number) => {
    const m = holes[i]
    const s = g.current
    if (!running || !m || m.status !== 'up' || !s.target) return
    setHammer(i)
    setTimeout(() => setHammer((h) => (h === i ? null : h)), 250)
    const now = performance.now()

    if (m.correct) {
      answer(m.kana.id, true, { silent: true })
      playSfx('pop')
      s.hits += 1
      s.combo += 1
      const gained = 10 * Math.min(4, 1 + Math.floor(s.combo / 5))
      if (s.combo % 5 === 0) playSfx('combo')
      setHits(s.hits)
      setCombo(s.combo)
      setMaxCombo((x) => Math.max(x, s.combo))
      setScore((x) => x + gained)
      setFlash(`+${gained}`)
      // Đập trúng: các chuột khác thụt xuống, sang lượt mới.
      setHoles((hs) => hs.map((h, j) => (j === i ? { ...h!, status: 'hit' } : null)))
      setTimeout(() => setHoles(Array(9).fill(null)), 280)
      closeRound(now, 350)
    } else {
      answer(s.target.id, false, { silent: true })
      playSfx('wrong')
      setWrongs((x) => x + 1)
      setWrongCount((c) => ({ ...c, [m.kana.char]: (c[m.kana.char] ?? 0) + 1 }))
      breakCombo()
      s.endAt -= PENALTY_MS
      setFlash(`−3s`)
      setShake(true)
      setTimeout(() => setShake(false), 400)
      setHoles((hs) => hs.map((h, j) => (j === i ? { ...h!, status: 'wrong' } : h)))
    }
    setTimeout(() => setFlash(null), 600)
  }

  const topWrong = Object.entries(wrongCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  return (
    <GameShell title="Đập chuột Kana" jp="もぐらたたき" active={running || !!summary} onExit={exit}>
      {!running && !summary ? (
        <StartScreen
          icon="🔨"
          onStart={start}
          desc={
            <>
              Mỗi lượt hiện một <b>âm romaji</b>. 2–3 chú chuột ngoi lên cầm biển chữ – hãy đập đúng chú cầm chữ
              tương ứng! Chữ gây nhiễu được chọn theo <b>hình dáng dễ nhầm</b> (シ/ツ, ぬ/め…). Đập nhầm bị <b>trừ 3 giây</b>. Ván 60 giây.
            </>
          }
        >
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-sumi-500">
            <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} className="size-4 accent-sakura-500" />
            Tự đọc phát âm mỗi lượt (luyện nghe)
          </label>
        </StartScreen>
      ) : (
        <div className="mx-auto max-w-md">
          <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm font-bold">
            <div className="card py-2"><div className="text-[11px] font-medium text-sumi-400">Điểm</div><div className="text-lg tabular-nums">{score}</div></div>
            <div className="card py-2"><div className="text-[11px] font-medium text-sumi-400">Combo</div><div className={cn('text-lg tabular-nums', multiplier > 1 && 'text-yuzu-500')}>{combo} <span className="text-xs">×{multiplier}</span></div></div>
            <div className="card py-2"><div className="flex items-center justify-center gap-1 text-[11px] font-medium text-sumi-400"><Timer className="size-3" />Thời gian</div><div className={cn('text-lg tabular-nums', timeLeft < 10_000 && 'text-sakura-500')}>{Math.ceil(timeLeft / 1000)}s</div></div>
          </div>

          {/* Đề bài */}
          <div className="card relative mb-4 flex items-center justify-center gap-4 py-4">
            <div className="text-center">
              <div className="text-xs font-semibold text-sumi-400">Đập chữ đọc là</div>
              <div className="text-5xl font-extrabold tracking-wide text-sakura-500">{target?.romaji ?? '…'}</div>
            </div>
            <button
              onClick={() => target && speak(target.char, { audioUrl: target.audioUrl })}
              disabled={!target}
              className="grid size-12 place-items-center rounded-full bg-sora-100 text-sora-500 hover:bg-sora-200 dark:bg-sora-500/20"
              aria-label="Nghe phát âm"
            >
              <Volume2 className="size-6" />
            </button>
            <button onClick={() => setAutoSpeak((v) => !v)} className="absolute top-2 right-2 rounded-lg p-1.5 text-sumi-400 hover:bg-sumi-100 dark:hover:bg-sumi-800" title={autoSpeak ? 'Tắt tự đọc' : 'Bật tự đọc'}>
              {autoSpeak ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </button>
            {multiplier > 1 && (
              <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-yuzu-400 px-2 py-0.5 text-xs font-extrabold text-white">
                <Zap className="size-3 fill-current" /> ×{multiplier}
              </div>
            )}
            {flash && (
              <div className={cn('pointer-events-none absolute right-16 animate-float-up text-2xl font-extrabold', flash.startsWith('+') ? 'text-matcha-500' : 'text-sakura-500')}>{flash}</div>
            )}
          </div>

          {/* Lưới 3×3 */}
          <div className={cn('grid grid-cols-3 gap-3 rounded-3xl bg-gradient-to-b from-matcha-200 to-matcha-300 p-3 sm:gap-4 sm:p-5 dark:from-matcha-500/30 dark:to-matcha-600/30', shake && 'animate-shake')}>
            {holes.map((m, i) => (
              <button
                key={i}
                onPointerDown={() => whack(i)}
                className="relative aspect-square select-none overflow-hidden rounded-2xl"
                style={{ touchAction: 'manipulation' }}
                aria-label={m ? `Chuột cầm chữ ${m.kana.char}` : 'Hang trống'}
              >
                {/* hang */}
                <div className="absolute inset-x-[8%] bottom-[6%] h-[34%] rounded-[50%] bg-sumi-800/80 dark:bg-sumi-950" />
                {/* chuột */}
                <div
                  className={cn(
                    'absolute inset-x-[16%] bottom-[18%] h-[76%] transition-transform duration-150 ease-out',
                    m ? 'translate-y-0' : 'translate-y-[110%]',
                  )}
                >
                  <div
                    className={cn(
                      'relative mx-auto flex h-full w-full flex-col items-center rounded-t-[45%] border-2 pt-[8%]',
                      m?.status === 'wrong'
                        ? 'border-sakura-500 bg-sakura-200'
                        : m?.status === 'hit'
                          ? 'border-matcha-500 bg-matcha-100'
                          : 'border-[#a0764e] bg-[#d9a877]',
                    )}
                  >
                    <div className="text-[0.6rem] leading-none sm:text-xs">● ●</div>
                    <div className={cn('mt-[6%] grid w-[88%] flex-1 place-items-center rounded-lg border-2 bg-white font-jp text-2xl font-bold shadow sm:text-4xl dark:bg-sumi-100 dark:text-sumi-900', m?.status === 'wrong' ? 'border-sakura-500 text-sakura-600' : 'border-[#a0764e]')}>
                      {m?.kana.char}
                    </div>
                    <div className="h-[10%]" />
                  </div>
                </div>
                {/* mép hang che thân chuột */}
                <div className="absolute inset-x-0 bottom-0 h-[16%] bg-matcha-300 dark:bg-[#34502a]" />
                {hammer === i && <div className="animate-hammer pointer-events-none absolute top-0 right-0 text-4xl sm:text-5xl">🔨</div>}
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-sumi-400">Đập nhầm: trừ 3 giây · Để chuột đúng trốn mất: mất combo</p>
        </div>
      )}

      <GameResult
        summary={summary}
        onReplay={start}
        missed={missed}
        reason={summary && !summary.won ? 'Cần đập trúng ít nhất 8 lần và nhiều hơn số lần nhầm/bỏ lỡ.' : undefined}
        stats={[
          { label: 'Điểm', value: score },
          { label: 'Combo cao nhất', value: maxCombo },
          { label: 'Đập trúng', value: hits },
          { label: 'Nhầm / Bỏ lỡ', value: `${wrongs} / ${misses}` },
        ]}
        extra={
          topWrong.length > 0 && (
            <div className="mt-4 rounded-2xl bg-sakura-50 p-3 text-left dark:bg-sakura-500/10">
              <div className="text-xs font-bold text-sumi-500">Chữ bạn đập nhầm nhiều nhất</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {topWrong.map(([ch, n]) => (
                  <span key={ch} className="flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 dark:bg-sumi-800">
                    <span className="font-jp text-lg font-bold text-sakura-600">{ch}</span>
                    <span className="text-xs text-sumi-400">×{n}</span>
                  </span>
                ))}
              </div>
            </div>
          )
        }
      />
    </GameShell>
  )
}
