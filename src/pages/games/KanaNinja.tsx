import { useCallback, useEffect, useRef, useState } from 'react'
import { Scroll, Timer, Zap } from 'lucide-react'
import { GameShell, StartScreen } from '../../components/GameShell'
import { GameResult } from '../../components/GameResult'
import { CATEGORY_LABELS, ROWS } from '../../data/kana'
import { useActivePool } from '../../hooks/useActivePool'
import { useGameSession } from '../../hooks/useGameSession'
import { playSfx } from '../../lib/audio'
import { cn, pick, shuffle, uniqueByRomaji } from '../../lib/utils'
import type { KanaCategory, KanaItem } from '../../types/kana'

const ROUND_MS = 60_000
const RULE_MS = 20_000
const PENALTY_MS = 3_000 // chém nhầm / chém bom / lọt 3 chữ → trừ 3 giây (thay cho mất tim)
const TRAIL_MS = 180
// Độ khó: trọng lực thấp → bóng bay chậm, lơ lửng lâu hơn (≈3 giây trên màn hình).
const GRAVITY = 0.5 // × chiều cao khung / giây²
const MAX_ON_SCREEN = 4
const BOMB_RATE = 0.07
const COLORS = ['#ffc2d1', '#c4e0ab', '#b6d6ff', '#ffe588', '#d9cbff', '#ffd6a5']

/* ---------------- Luật chém ---------------- */

interface Rule {
  label: string
  test: (k: KanaItem) => boolean
}

/** Sinh các luật hợp lệ với pool hiện tại (phải có cả chữ đúng lẫn chữ sai). */
function makeRules(pool: KanaItem[]): Rule[] {
  const rules: Rule[] = []
  const types = new Set(pool.map((k) => k.type))
  if (types.size > 1) {
    rules.push({ label: 'Chém tất cả chữ HIRAGANA – bỏ qua Katakana!', test: (k) => k.type === 'hiragana' })
    rules.push({ label: 'Chém tất cả chữ KATAKANA – bỏ qua Hiragana!', test: (k) => k.type === 'katakana' })
  }
  const cats = new Set(pool.map((k) => k.category))
  if (cats.size > 1)
    for (const c of cats) {
      const l = CATEGORY_LABELS[c as KanaCategory]
      rules.push({ label: `Chỉ chém ${l.vi.toLowerCase()} (${l.jp})`, test: (k) => k.category === c })
    }
  for (const r of ROWS) {
    const inRow = pool.filter((k) => k.row === r.id)
    if (inRow.length >= 2 && inRow.length < pool.length)
      rules.push({
        label: `Chỉ chém chữ ${r.label.startsWith('Hàng') ? r.label.replace('Hàng', 'hàng') : 'hàng ' + r.label} (${inRow.slice(0, 5).map((k) => k.char).join(', ')})`,
        test: (k) => k.row === r.id,
      })
  }
  for (const v of ['a', 'i', 'u', 'e', 'o']) {
    const n = pool.filter((k) => k.romaji.endsWith(v)).length
    if (n >= 2 && n < pool.length) rules.push({ label: `Chỉ chém chữ có đuôi âm "-${v}"`, test: (k) => k.romaji.endsWith(v) })
  }
  const valid = rules.filter((r) => pool.some(r.test) && pool.some((k) => !r.test(k)))
  if (valid.length) return valid
  const one = pick(pool)
  return [{ label: `Chỉ chém chữ đọc là "${one.romaji}"`, test: (k) => k.romaji === one.romaji }]
}

/* ---------------- Vật thể ---------------- */

interface Ball {
  id: number
  kana: KanaItem | null // null = bom
  x: number
  y: number
  vx: number
  vy: number
  r: number
  color: string
  sliced: boolean
}
interface Piece {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  side: 0 | 1
  ball: Ball
  life: number
}
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
  size: number
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const len = dx * dx + dy * dy
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

export default function KanaNinja() {
  const { pool } = useActivePool()
  const { answer, finish, reset, summary, missed } = useGameSession('ninja')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [running, setRunning] = useState(false)
  const [hud, setHud] = useState({ score: 0, combo: 0, timeLeft: ROUND_MS, rule: '', ruleLeft: RULE_MS })
  const [flash, setFlash] = useState<null | 'bad' | 'good'>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [final, setFinal] = useState({ sliced: 0, wrong: 0, bombs: 0, misses: 0, maxCombo: 0 })

  const g = useRef({
    W: 600,
    H: 480,
    balls: [] as Ball[],
    pieces: [] as Piece[],
    particles: [] as Particle[],
    trail: [] as { x: number; y: number; t: number }[],
    down: false,
    rules: [] as Rule[],
    rule: null as Rule | null,
    ruleAt: 0,
    endAt: 0,
    nextSpawn: 0,
    id: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    missStreak: 0,
    sliced: 0,
    wrong: 0,
    bombs: 0,
    misses: 0,
    pool: [] as KanaItem[],
    shakeUntil: 0,
  })

  const say = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage((m) => (m === msg ? null : m)), 1200)
  }
  const doFlash = (f: 'bad' | 'good') => {
    setFlash(f)
    setTimeout(() => setFlash(null), f === 'bad' ? 350 : 150)
  }

  /* ---------- Kích thước canvas (hỗ trợ màn hình retina) ---------- */
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const fit = () => {
      const dpr = window.devicePixelRatio || 1
      const W = wrap.clientWidth
      const H = Math.min(520, Math.max(360, Math.round(W * 0.8)))
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.height = `${H}px`
      canvas.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.current.W = W
      g.current.H = H
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [running, summary])

  const penalize = useCallback((msg: string) => {
    const s = g.current
    s.endAt -= PENALTY_MS
    s.combo = 0
    s.shakeUntil = performance.now() + 300
    doFlash('bad')
    say(`${msg} −3s`)
  }, [])

  /* ---------- Vòng lặp game ---------- */
  useEffect(() => {
    if (!running) return
    const ctx = canvasRef.current!.getContext('2d')!
    let raf = 0
    let last = performance.now()
    let lastHud = 0

    const spawn = (now: number) => {
      const s = g.current
      const { W, H } = s
      const onScreen = s.balls.filter((b) => !b.sliced).length
      // Mỗi đợt 1 chữ, thỉnh thoảng 2; không vượt quá MAX_ON_SCREEN bóng cùng lúc.
      const n = Math.min(Math.random() < 0.25 ? 2 : 1, MAX_ON_SCREEN - onScreen)
      for (let i = 0; i < n; i++) {
        const isBomb = Math.random() < BOMB_RATE
        const good = s.pool.filter((k) => s.rule!.test(k))
        const bad = s.pool.filter((k) => !s.rule!.test(k))
        const kana = isBomb ? null : Math.random() < 0.55 && good.length ? pick(good) : pick(bad.length ? bad : good)
        const r = Math.max(26, Math.min(40, W * 0.06))
        const x = W * (0.15 + Math.random() * 0.7)
        const grav = H * GRAVITY
        const peak = H * (0.5 + Math.random() * 0.35)
        s.balls.push({
          id: s.id++,
          kana,
          x,
          y: H + r,
          vx: (W / 2 - x) * (0.15 + Math.random() * 0.25) + (Math.random() - 0.5) * W * 0.1,
          vy: -Math.sqrt(2 * grav * peak),
          r,
          color: pick(COLORS),
          sliced: false,
        })
      }
      const elapsed = ROUND_MS - (s.endAt - now)
      // Nhịp bắn: 1.8s lúc đầu → nhanh dần tới 1.1s.
      s.nextSpawn = now + Math.max(1100, 1800 - elapsed / 80) * (0.85 + Math.random() * 0.3)
    }

    const burst = (x: number, y: number, color: string, n: number, speed: number) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const v = speed * (0.4 + Math.random())
        g.current.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, color, size: 2 + Math.random() * 4 })
      }
    }

    const sliceBall = (b: Ball) => {
      const s = g.current
      b.sliced = true
      if (!b.kana) {
        // Bom
        s.bombs++
        playSfx('boom')
        burst(b.x, b.y, '#34302c', 40, 420)
        burst(b.x, b.y, '#fbbd1f', 25, 300)
        penalize('💣 Bùm!')
        return
      }
      const good = s.rule!.test(b.kana)
      if (good) {
        s.sliced++
        s.combo++
        s.maxCombo = Math.max(s.maxCombo, s.combo)
        s.missStreak = 0
        const mult = Math.min(4, 1 + Math.floor(s.combo / 5))
        s.score += 10 * mult
        answer(b.kana.id, true, { silent: true })
        playSfx(s.combo % 5 === 0 ? 'combo' : 'slash')
        doFlash('good')
        // Vỡ làm đôi
        const ang = Math.random() * Math.PI
        for (const side of [0, 1] as const) {
          const dir = side ? 1 : -1
          s.pieces.push({ x: b.x, y: b.y, vx: b.vx * 0.5 + dir * 140, vy: b.vy * 0.3 - 80, rot: ang, vr: dir * 5, side, ball: b, life: 1 })
        }
        burst(b.x, b.y, b.color, 18, 260)
      } else {
        s.wrong++
        answer(b.kana.id, false, { silent: true })
        playSfx('wrong')
        burst(b.x, b.y, '#e84872', 20, 280)
        penalize(`✗ ${b.kana.char} sai luật!`)
      }
    }

    const draw = (now: number) => {
      const s = g.current
      const { W, H } = s
      ctx.save()
      ctx.clearRect(0, 0, W, H)
      if (now < s.shakeUntil) ctx.translate((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12)

      // Bóng & bom
      for (const b of s.balls) {
        if (b.sliced) continue
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        if (b.kana) {
          ctx.fillStyle = b.color
          ctx.fill()
          ctx.lineWidth = 3
          ctx.strokeStyle = 'rgba(255,255,255,0.9)'
          ctx.stroke()
          ctx.fillStyle = '#24211f'
          ctx.font = `bold ${b.r * (b.kana.char.length > 1 ? 0.8 : 1.1)}px "Noto Sans JP", sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(b.kana.char, b.x, b.y + 2)
        } else {
          ctx.fillStyle = '#1a1816'
          ctx.fill()
          ctx.lineWidth = 3
          ctx.strokeStyle = '#4a4540'
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(b.x + b.r * 0.5, b.y - b.r * 0.8)
          ctx.quadraticCurveTo(b.x + b.r, b.y - b.r * 1.4, b.x + b.r * 1.2, b.y - b.r * 1.2)
          ctx.strokeStyle = '#8f887c'
          ctx.stroke()
          if (Math.floor(now / 120) % 2) {
            ctx.beginPath()
            ctx.arc(b.x + b.r * 1.2, b.y - b.r * 1.2, 6, 0, Math.PI * 2)
            ctx.fillStyle = '#fbbd1f'
            ctx.fill()
          }
          ctx.fillStyle = '#ff96b0'
          ctx.font = `bold ${b.r * 0.8}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('✕', b.x, b.y)
        }
      }

      // Mảnh vỡ
      for (const p of s.pieces) {
        ctx.save()
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.beginPath()
        ctx.arc(0, 0, p.ball.r, p.side ? 0 : Math.PI, p.side ? Math.PI : Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        ctx.rotate(-p.rot)
        ctx.beginPath()
        ctx.arc(0, 0, p.ball.r, 0, Math.PI * 2)
        ctx.fillStyle = p.ball.color
        ctx.fill()
        ctx.fillStyle = '#24211f'
        ctx.font = `bold ${p.ball.r * 1.1}px "Noto Sans JP", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(p.ball.kana?.char ?? '', 0, 2)
        ctx.restore()
      }

      // Hạt nổ
      for (const p of s.particles) {
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // Vệt kiếm
      const trail = s.trail.filter((t) => now - t.t < TRAIL_MS)
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1]
        const b = trail[i]
        const k = 1 - (now - b.t) / TRAIL_MS
        ctx.strokeStyle = `rgba(255,255,255,${0.9 * k})`
        ctx.shadowColor = '#ff96b0'
        ctx.shadowBlur = 16
        ctx.lineWidth = 2 + 8 * k
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
      ctx.shadowBlur = 0
      ctx.restore()
    }

    const loop = (now: number) => {
      const s = g.current
      const dt = Math.min(0.04, (now - last) / 1000)
      last = now
      const grav = s.H * GRAVITY

      if (now >= s.ruleAt) {
        const others = s.rules.filter((r) => r !== s.rule)
        s.rule = pick(others.length ? others : s.rules)
        s.ruleAt = now + RULE_MS
        playSfx('ting')
        say('📜 Luật mới!')
      }
      if (now >= s.nextSpawn) spawn(now)

      for (const b of s.balls) {
        b.vy += grav * dt
        b.x += b.vx * dt
        b.y += b.vy * dt
      }
      // Rơi khỏi màn hình
      const gone = s.balls.filter((b) => !b.sliced && b.vy > 0 && b.y > s.H + b.r)
      for (const b of gone) {
        if (b.kana && s.rule!.test(b.kana)) {
          s.misses++
          s.missStreak++
          s.combo = 0
          if (s.missStreak >= 3) {
            s.missStreak = 0
            penalize('Lọt 3 chữ liên tiếp!')
          }
        }
      }
      s.balls = s.balls.filter((b) => !b.sliced && !(b.vy > 0 && b.y > s.H + b.r))

      for (const p of s.pieces) {
        p.vy += grav * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rot += p.vr * dt
        p.life -= dt * 0.9
      }
      s.pieces = s.pieces.filter((p) => p.life > 0 && p.y < s.H + 80)
      for (const p of s.particles) {
        p.vy += grav * 0.4 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.life -= dt * 1.8
      }
      s.particles = s.particles.filter((p) => p.life > 0)

      draw(now)

      if (now - lastHud > 100) {
        lastHud = now
        setHud({ score: s.score, combo: s.combo, timeLeft: Math.max(0, s.endAt - now), rule: s.rule!.label, ruleLeft: Math.max(0, s.ruleAt - now) })
      }
      if (now < s.endAt) raf = requestAnimationFrame(loop)
      else {
        setRunning(false)
        const { sliced, wrong, bombs, misses, maxCombo, score } = s
        setFinal({ sliced, wrong, bombs, misses, maxCombo })
        setHud((h) => ({ ...h, score, timeLeft: 0 }))
        finish(score, sliced >= 10 && sliced > (wrong + bombs) * 2)
      }
    }

    // Chém: pointer events dùng chung cho chuột và cảm ứng.
    const canvas = canvasRef.current!
    const pos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const onDown = (e: PointerEvent) => {
      g.current.down = true
      try {
        canvas.setPointerCapture(e.pointerId)
      } catch {
        /* một số trình duyệt cũ không hỗ trợ */
      }
      g.current.trail = [{ ...pos(e), t: performance.now() }]
    }
    const onMove = (e: PointerEvent) => {
      const s = g.current
      if (!s.down) return
      const p = { ...pos(e), t: performance.now() }
      const prev = s.trail[s.trail.length - 1] ?? p
      s.trail.push(p)
      if (s.trail.length > 40) s.trail.shift()
      for (const b of s.balls) {
        if (!b.sliced && distToSegment(b.x, b.y, prev.x, prev.y, p.x, p.y) <= b.r) sliceBall(b)
      }
    }
    const onUp = () => (g.current.down = false)
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)

    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [running, answer, finish, penalize])

  const start = () => {
    reset()
    const now = performance.now()
    const p = uniqueByRomaji(pool)
    const rules = shuffle(makeRules(p))
    Object.assign(g.current, {
      balls: [], pieces: [], particles: [], trail: [], pool: p, rules, rule: null, ruleAt: now,
      endAt: now + ROUND_MS, nextSpawn: now + 800, score: 0, combo: 0, maxCombo: 0, missStreak: 0,
      sliced: 0, wrong: 0, bombs: 0, misses: 0,
    })
    setHud({ score: 0, combo: 0, timeLeft: ROUND_MS, rule: '', ruleLeft: RULE_MS })
    setRunning(true)
  }

  const exit = () => {
    setRunning(false)
    reset()
  }

  const multiplier = Math.min(4, 1 + Math.floor(hud.combo / 5))

  return (
    <GameShell title="Kana Ninja" jp="かなニンジャ" active={running || !!summary} onExit={exit}>
      {!running && !summary ? (
        <StartScreen
          icon="🥷"
          onStart={start}
          desc={
            <>
              Vuốt chuột / ngón tay để <b>chém</b> bong bóng chữ đúng theo <b>luật</b> hiển thị phía trên – luật đổi sau mỗi
              20 giây. Chém nhầm chữ, chém trúng 💣, hoặc để lọt 3 chữ đúng liên tiếp đều bị <b>trừ 3 giây</b>. Ván 60 giây.
            </>
          }
        />
      ) : (
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm font-bold">
            <div className="card py-2"><div className="text-[11px] font-medium text-sumi-400">Điểm</div><div className="text-lg tabular-nums">{hud.score}</div></div>
            <div className="card py-2"><div className="text-[11px] font-medium text-sumi-400">Combo</div><div className={cn('text-lg tabular-nums', multiplier > 1 && 'text-yuzu-500')}>{hud.combo} <span className="text-xs">×{multiplier}</span></div></div>
            <div className="card py-2"><div className="flex items-center justify-center gap-1 text-[11px] font-medium text-sumi-400"><Timer className="size-3" />Thời gian</div><div className={cn('text-lg tabular-nums', hud.timeLeft < 10_000 && 'text-sakura-500')}>{Math.ceil(hud.timeLeft / 1000)}s</div></div>
          </div>

          <div className="mb-3 flex items-center gap-3 rounded-2xl border-2 border-fuji-300 bg-fuji-50 px-4 py-3 dark:border-fuji-500/40 dark:bg-fuji-500/10">
            <Scroll className="size-6 shrink-0 text-fuji-500" />
            <div className="flex-1 text-base font-extrabold sm:text-lg">{hud.rule || '…'}</div>
            <div className="shrink-0 text-xs font-semibold tabular-nums text-sumi-400">đổi sau {Math.ceil(hud.ruleLeft / 1000)}s</div>
          </div>

          <div ref={wrapRef} className="relative overflow-hidden rounded-3xl border border-sumi-200 bg-gradient-to-b from-sumi-800 via-fuji-500/40 to-sakura-400/40 dark:border-sumi-700">
            <canvas ref={canvasRef} className="block w-full cursor-crosshair select-none" style={{ touchAction: 'none' }} />
            {flash && <div className={cn('pointer-events-none absolute inset-0', flash === 'bad' ? 'bg-sakura-500/40' : 'bg-white/10')} />}
            {message && (
              <div className="pointer-events-none absolute inset-x-0 top-4 mx-auto w-fit animate-pop rounded-full bg-white/90 px-4 py-1.5 text-sm font-extrabold text-sumi-800 shadow">{message}</div>
            )}
            {multiplier > 1 && (
              <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-1 rounded-full bg-yuzu-400 px-3 py-1 text-sm font-extrabold text-white shadow">
                <Zap className="size-4 fill-current" /> ×{multiplier}
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-sumi-400">Giữ chuột và kéo (hoặc vuốt ngón tay) để chém</p>
        </div>
      )}

      <GameResult
        summary={summary}
        onReplay={start}
        missed={missed}
        reason={summary && !summary.won ? 'Cần chém đúng ít nhất 10 chữ và ít nhầm hơn.' : undefined}
        stats={[
          { label: 'Điểm', value: hud.score },
          { label: 'Combo cao nhất', value: final.maxCombo },
          { label: 'Chém đúng', value: final.sliced },
          { label: 'Nhầm / Bom / Lọt', value: `${final.wrong} / ${final.bombs} / ${final.misses}` },
        ]}
      />
    </GameShell>
  )
}
