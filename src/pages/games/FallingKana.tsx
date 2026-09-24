import { useCallback, useEffect, useRef, useState } from 'react'
import { Keyboard, Timer, TriangleAlert, Zap } from 'lucide-react'
import { GameShell, StartScreen } from '../../components/GameShell'
import { GameResult } from '../../components/GameResult'
import { useActivePool } from '../../hooks/useActivePool'
import { useGameSession } from '../../hooks/useGameSession'
import { playSfx } from '../../lib/audio'
import { acceptedRomaji, matchesRomaji } from '../../lib/romaji'
import { cn, pick, sample, shuffle, uniqueByRomaji } from '../../lib/utils'
import type { KanaItem } from '../../types/kana'

const ROUND_MS = 60_000
const LINE = 0.86 // vị trí vạch đỏ (tỷ lệ chiều cao)

interface Drop {
  uid: number
  kana: KanaItem
  x: number // %
  y: number // 0 → LINE
  speed: number // đơn vị chiều cao / giây
}
interface Pop {
  uid: number
  x: number
  y: number
  text: string
  good: boolean
}

export default function FallingKana() {
  const { pool } = useActivePool()
  const { answer, finish, reset, summary } = useGameSession('falling')
  const [running, setRunning] = useState(false)
  const [, setFrame] = useState(0)
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [timeLeft, setTimeLeft] = useState(ROUND_MS)
  const [pops, setPops] = useState<Pop[]>([])
  const [shake, setShake] = useState(false)

  const drops = useRef<Drop[]>([])
  const uid = useRef(0)
  const poolRef = useRef<KanaItem[]>([])
  const comboRef = useRef(0)
  const hitsRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const optionsFor = useRef<{ uid: number; opts: string[] } | null>(null)

  const multiplier = Math.min(4, 1 + Math.floor(combo / 5))

  const addPop = (d: Drop, text: string, good: boolean) => {
    const p = { uid: uid.current++, x: d.x, y: d.y, text, good }
    setPops((ps) => [...ps, p])
    setTimeout(() => setPops((ps) => ps.filter((q) => q.uid !== p.uid)), 900)
  }

  const miss = useCallback(
    (d?: Drop) => {
      if (d) answer(d.kana.id, false)
      else playSfx('wrong')
      comboRef.current = 0
      setCombo(0)
      setMisses((m) => m + 1)
      setShake(true)
      setTimeout(() => setShake(false), 400)
    },
    [answer],
  )

  const hit = useCallback(
    (d: Drop) => {
      drops.current = drops.current.filter((x) => x.uid !== d.uid)
      answer(d.kana.id, true, { silent: true })
      comboRef.current += 1
      hitsRef.current += 1
      const mult = Math.min(4, 1 + Math.floor(comboRef.current / 5))
      const gained = 10 * mult
      playSfx(comboRef.current % 5 === 0 ? 'combo' : 'correct')
      setCombo(comboRef.current)
      setMaxCombo((m) => Math.max(m, comboRef.current))
      setHits(hitsRef.current)
      setScore((s) => s + gained)
      addPop(d, `+${gained}`, true)
    },
    [answer],
  )

  /* ---------- Vòng lặp game ---------- */
  useEffect(() => {
    if (!running) return
    let raf = 0
    let last = performance.now()
    const startedAt = last
    let nextSpawn = 0

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const elapsed = now - startedAt
      const level = 1 + Math.floor(hitsRef.current / 8)

      if (elapsed >= nextSpawn) {
        const onScreen = new Set(drops.current.map((d) => d.kana.romaji))
        const candidates = poolRef.current.filter((k) => !onScreen.has(k.romaji))
        if (candidates.length) {
          drops.current.push({
            uid: uid.current++,
            kana: pick(candidates),
            x: 8 + Math.random() * 84,
            y: 0,
            speed: Math.min(0.32, 0.085 + level * 0.018 + Math.random() * 0.02),
          })
        }
        nextSpawn = elapsed + Math.max(750, 2300 - level * 180)
      }

      const fallen: Drop[] = []
      for (const d of drops.current) {
        d.y += d.speed * dt
        if (d.y >= LINE) fallen.push(d)
      }
      if (fallen.length) {
        drops.current = drops.current.filter((d) => !fallen.includes(d))
        fallen.forEach((d) => {
          addPop(d, d.kana.romaji, false)
          miss(d)
        })
      }

      setTimeLeft(Math.max(0, ROUND_MS - elapsed))
      setFrame((f) => f + 1)
      if (elapsed < ROUND_MS) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running, miss])

  /* ---------- Kết thúc ván ---------- */
  useEffect(() => {
    if (!running) return
    if (timeLeft <= 0) {
      setRunning(false)
      drops.current = []
      finish(score, hits > misses)
    }
  }, [timeLeft, running, finish, score, hits, misses])

  const start = () => {
    reset()
    poolRef.current = uniqueByRomaji(pool)
    drops.current = []
    comboRef.current = 0
    hitsRef.current = 0
    optionsFor.current = null
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setHits(0)
    setMisses(0)
    setInput('')
    setTimeLeft(ROUND_MS)
    setRunning(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  /* ---------- Nhập liệu ---------- */
  const target = drops.current.reduce<Drop | null>((a, d) => (!a || d.y > a.y ? d : a), null)

  // 4 đáp án cho chữ thấp nhất – giữ cố định cho tới khi mục tiêu đổi.
  if (target && optionsFor.current?.uid !== target.uid) {
    const distract = sample(
      poolRef.current.filter((k) => k.romaji !== target.kana.romaji).map((k) => k.romaji),
      3,
    )
    optionsFor.current = { uid: target.uid, opts: shuffle([target.kana.romaji, ...distract]) }
  }

  const onType = (v: string) => {
    const val = v.toLowerCase().replace(/[^a-z]/g, '')
    const matches = drops.current.filter((d) => matchesRomaji(val, d.kana.romaji)).sort((a, b) => b.y - a.y)
    // Chờ gõ tiếp nếu còn chữ khác bắt đầu bằng chuỗi này (vd "n" → "na").
    const ambiguous = drops.current.some((d) => acceptedRomaji(d.kana.romaji).some((r) => r.length > val.length && r.startsWith(val)))
    if (matches.length && !ambiguous) {
      hit(matches[0])
      setInput('')
    } else setInput(val)
  }

  const onEnter = () => {
    if (!input) return
    const m = drops.current.filter((d) => matchesRomaji(input, d.kana.romaji)).sort((a, b) => b.y - a.y)
    if (m.length) hit(m[0])
    else miss(target ?? undefined)
    setInput('')
  }

  const choose = (romaji: string) => {
    if (!target) return
    if (romaji === target.kana.romaji) hit(target)
    else {
      addPop(target, '✗', false)
      miss(target)
    }
  }

  return (
    <GameShell title="Ký tự rơi tự do" jp="落ちるかな">
      {!running && !summary ? (
        <StartScreen
          icon="🌧️"
          onStart={start}
          desc={
            <>
              Chữ Kana rơi từ trên xuống, ngày càng nhanh. Gõ <b>romaji</b> trên bàn phím hoặc chọn 1 trong 4 đáp án
              trước khi chữ chạm <span className="font-bold text-sakura-500">vạch đỏ</span>. Chuỗi 5 câu đúng liên tiếp tăng hệ số điểm (tối đa ×4). Ván kéo dài 60 giây.
            </>
          }
        />
      ) : (
        <div className="mx-auto max-w-2xl">
          <div className="mb-3 grid grid-cols-4 gap-2 text-center text-sm font-bold">
            <div className="card py-2"><div className="text-[11px] font-medium text-sumi-400">Điểm</div><div className="text-lg tabular-nums">{score}</div></div>
            <div className="card py-2"><div className="text-[11px] font-medium text-sumi-400">Combo</div><div className={cn('text-lg tabular-nums', multiplier > 1 && 'text-yuzu-500')}>{combo} <span className="text-xs">×{multiplier}</span></div></div>
            <div className="card py-2"><div className="flex items-center justify-center gap-1 text-[11px] font-medium text-sumi-400"><Timer className="size-3" />Thời gian</div><div className="text-lg tabular-nums">{Math.ceil(timeLeft / 1000)}s</div></div>
            <div className="card py-2"><div className="flex items-center justify-center gap-1 text-[11px] font-medium text-sumi-400"><TriangleAlert className="size-3" />Bỏ lỡ</div><div className="text-lg text-sakura-500 tabular-nums">{misses}</div></div>
          </div>

          <div
            className={cn(
              'relative h-[380px] overflow-hidden rounded-3xl border border-sumi-200 bg-gradient-to-b from-sora-50 to-white sm:h-[440px] dark:border-sumi-700 dark:from-sumi-900 dark:to-sumi-800',
              shake && 'animate-shake',
            )}
            onClick={() => inputRef.current?.focus()}
          >
            {multiplier > 1 && (
              <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-yuzu-400 px-3 py-1 text-sm font-extrabold text-white shadow">
                <Zap className="size-4 fill-current" /> COMBO ×{multiplier}
              </div>
            )}
            {drops.current.map((d) => (
              <div
                key={d.uid}
                className={cn(
                  'absolute grid size-14 -translate-x-1/2 place-items-center rounded-2xl border-2 bg-white font-jp text-3xl font-bold shadow-md sm:size-16 sm:text-4xl dark:bg-sumi-700',
                  d === target ? 'border-sakura-400 ring-4 ring-sakura-200 dark:ring-sakura-500/30' : 'border-sumi-200 dark:border-sumi-600',
                )}
                style={{ left: `${d.x}%`, top: `calc(${d.y * 100}% - 3.5rem)` }}
              >
                {d.kana.char}
              </div>
            ))}
            {pops.map((p) => (
              <div
                key={p.uid}
                className={cn('pointer-events-none absolute -translate-x-1/2 animate-float-up text-lg font-extrabold', p.good ? 'text-matcha-500' : 'text-sakura-500')}
                style={{ left: `${p.x}%`, top: `${p.y * 100}%` }}
              >
                {p.text}
              </div>
            ))}
            <div className="absolute inset-x-0 border-t-4 border-dashed border-sakura-400" style={{ top: `${LINE * 100}%` }} />
            <div className="absolute inset-x-0 bottom-0 bg-sakura-100/60 dark:bg-sakura-500/10" style={{ top: `${LINE * 100}%` }} />
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {(target && optionsFor.current ? optionsFor.current.opts : ['', '', '', '']).map((o, i) => (
              <button key={`${o}-${i}`} disabled={!o || !running} onClick={() => choose(o)} className="btn-secondary py-3 text-lg">
                {o || '·'}
              </button>
            ))}
          </div>

          <div className="relative mt-3">
            <Keyboard className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-sumi-400" />
            <input
              ref={inputRef}
              value={input}
              disabled={!running}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onEnter()}
              placeholder="Gõ romaji… (vd: ka, shi, tsu)"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full rounded-2xl border-2 border-sumi-200 bg-white py-3 pr-4 pl-12 text-lg font-semibold outline-none focus:border-sakura-400 dark:border-sumi-700 dark:bg-sumi-800"
            />
          </div>
        </div>
      )}

      <GameResult
        summary={summary}
        onReplay={start}
        reason={summary && !summary.won ? 'Số chữ bắt được cần nhiều hơn số chữ bỏ lỡ.' : undefined}
        stats={[
          { label: 'Điểm', value: score },
          { label: 'Combo cao nhất', value: maxCombo },
          { label: 'Bắt được', value: hits },
          { label: 'Bỏ lỡ / sai', value: misses },
        ]}
      />
    </GameShell>
  )
}
