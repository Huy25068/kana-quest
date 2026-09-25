import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { ArrowRight, Eye, EyeOff, Info, RotateCcw, SkipForward, Volume2 } from 'lucide-react'
import { GameShell, StartScreen } from '../../components/GameShell'
import { GameResult } from '../../components/GameResult'
import { KANA_BY_CHAR } from '../../data/kana'
import { STROKES, type Stroke } from '../../data/strokes'
import { useActivePool } from '../../hooks/useActivePool'
import { useGameSession } from '../../hooks/useGameSession'
import { useProgressStore } from '../../store/useProgressStore'
import { playSfx, speak } from '../../lib/audio'
import { cn, shuffle } from '../../lib/utils'

type P = { x: number; y: number }
type InkPt = P & { w: number }

const SESSION = 8

/* ---------------- Hình học ---------------- */

const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y)
const pathLen = (ps: P[]) => ps.reduce((s, p, i) => (i ? s + dist(ps[i - 1], p) : 0), 0)

function distToPolyline(p: P, line: P[]) {
  let best = Infinity
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]
    const b = line[i]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = dx * dx + dy * dy
    const t = len ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len)) : 0
    best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)))
  }
  return best
}

/** Nội suy Catmull-Rom qua các điểm mốc → đường cong mượt. */
function spline(pts: P[]): P[] {
  if (pts.length === 2) return Array.from({ length: 21 }, (_, i) => ({ x: pts[0].x + ((pts[1].x - pts[0].x) * i) / 20, y: pts[0].y + ((pts[1].y - pts[0].y) * i) / 20 }))
  const out: P[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    for (let s = 0; s < 12; s++) {
      const t = s / 12
      const t2 = t * t
      const t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) })
    }
  }
  out.push(pts[pts.length - 1])
  return out
}

/** Lấy mẫu lại nét người dùng mỗi ~3px để kiểm tra không bị "nhảy cóc" khi vẽ nhanh. */
function resample(ps: P[], step = 3): P[] {
  if (ps.length < 2) return ps
  const out = [ps[0]]
  for (let i = 1; i < ps.length; i++) {
    const a = ps[i - 1]
    const b = ps[i]
    const n = Math.max(1, Math.floor(dist(a, b) / step))
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n })
  }
  return out
}

interface Check {
  ok: boolean
  reason?: string
  avg?: number
}

/** Thuật toán chấm một nét: điểm đặt bút, chiều, độ lệch (tolerance) và thứ tự đi qua các điểm mốc. */
function validateStroke(userRaw: P[], model: P[], checkpoints: P[], tol: number): Check {
  const user = resample(userRaw)
  if (user.length < 3 || pathLen(user) < pathLen(model) * 0.45) return { ok: false, reason: 'Nét quá ngắn – hãy vẽ hết nét.' }
  const first = user[0]
  const last = user[user.length - 1]
  if (dist(first, model[model.length - 1]) < tol * 1.6 && dist(last, model[0]) < tol * 1.6)
    return { ok: false, reason: 'Ngược chiều nét! Hãy đi theo mũi tên.' }
  if (dist(first, model[0]) > tol * 1.8) return { ok: false, reason: 'Đặt bút sai chỗ – bắt đầu từ chấm có số.' }
  const ds = user.map((p) => distToPolyline(p, model))
  if (ds.filter((d) => d > tol).length / ds.length > 0.15) return { ok: false, reason: 'Nét bị lệch khỏi đường mẫu.' }
  let next = 0
  for (const p of user) if (next < checkpoints.length && dist(p, checkpoints[next]) <= tol * 1.4) next++
  if (next < checkpoints.length) return { ok: false, reason: 'Chưa đi qua đủ các điểm của nét.' }
  return { ok: true, avg: ds.reduce((a, b) => a + b, 0) / ds.length }
}

const grade = (score: number) => (score >= 95 ? 'Hoàn hảo' : score >= 85 ? 'Rất tốt' : score >= 70 ? 'Tốt' : 'Cần luyện thêm')

/* ---------------- Component ---------------- */

export default function KanaTracing() {
  const { pool } = useActivePool()
  const { answer, finish, reset, summary } = useGameSession('tracing')
  const addExp = useProgressStore((s) => s.addExp)

  // Chữ trong phạm vi học có dữ liệu nét; nếu không có thì dùng bộ mẫu.
  const inScope = useMemo(() => [...new Set(pool.map((k) => k.char))].filter((c) => STROKES[c]), [pool])
  const usingSample = inScope.length === 0

  const [queue, setQueue] = useState<string[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [strokeIdx, setStrokeIdx] = useState(0)
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null)
  const [charResult, setCharResult] = useState<{ score: number } | null>(null)
  const [results, setResults] = useState<number[]>([])
  const [showGhost, setShowGhost] = useState(true)
  const [size, setSize] = useState(340)

  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const st = useRef({
    ink: [] as InkPt[][], // nét đã hoàn thành
    current: [] as InkPt[],
    lastT: 0,
    drawing: false,
    strokeScores: [] as number[],
    fails: 0,
    failFlashUntil: 0,
  })

  const char = queue?.[idx]
  const autoNext = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(autoNext.current), [])
  const strokes: Stroke[] = char ? STROKES[char] : []

  /* ---------- Toạ độ ---------- */
  const pad = size * 0.08
  const toCanvas = useCallback((x: number, y: number): P => ({ x: pad + (x / 100) * (size - 2 * pad), y: pad + (y / 100) * (size - 2 * pad) }), [pad, size])
  const models = useMemo(() => strokes.map((s) => spline(s.map(([x, y]) => toCanvas(x, y)))), [strokes, toCanvas])
  const checkpoints = useMemo(() => strokes.map((s) => s.map(([x, y]) => toCanvas(x, y))), [strokes, toCanvas])
  const tol = size * 0.075 // ~25px với khung 340px

  /* ---------- Kích thước ---------- */
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const fit = () => setSize(Math.min(380, wrap.clientWidth))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [queue])

  /* ---------- Vẽ (rAF cho hiệu ứng nhấp nháy & mũi tên chạy) ---------- */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !char) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const dark = document.documentElement.classList.contains('dark')
    let raf = 0

    const drawInk = (pts: InkPt[], color: string) => {
      ctx.strokeStyle = color
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (let i = 1; i < pts.length; i++) {
        ctx.lineWidth = (pts[i - 1].w + pts[i].w) / 2
        ctx.beginPath()
        ctx.moveTo(pts[i - 1].x, pts[i - 1].y)
        ctx.lineTo(pts[i].x, pts[i].y)
        ctx.stroke()
      }
    }
    const drawPath = (pts: P[], width: number, color: string) => {
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
      ctx.stroke()
    }

    const frame = (now: number) => {
      const s = st.current
      ctx.clearRect(0, 0, size, size)

      // Giấy ô vuông (genkō yōshi)
      ctx.setLineDash([6, 6])
      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.12)' : 'rgba(232,72,114,0.18)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(size / 2, 0)
      ctx.lineTo(size / 2, size)
      ctx.moveTo(0, size / 2)
      ctx.lineTo(size, size / 2)
      ctx.stroke()
      ctx.setLineDash([])

      // Chữ mờ nền
      if (showGhost) models.forEach((m) => drawPath(m, size * 0.07, dark ? 'rgba(255,255,255,0.10)' : 'rgba(52,48,44,0.09)'))

      // Nét đã viết
      const inkColor = dark ? '#f7f6f4' : '#1a1816'
      s.ink.forEach((pts) => drawInk(pts, inkColor))

      const cur = models[strokeIdx]
      if (cur && !charResult) {
        // Nét cần viết – nhấp nháy
        const a = 0.35 + 0.3 * Math.sin(now / 220)
        drawPath(cur, size * 0.05, now < s.failFlashUntil ? `rgba(232,72,114,0.8)` : `rgba(247,103,140,${a})`)

        // Mũi tên chạy theo chiều nét
        const tt = (now % 1400) / 1400
        const k = Math.min(cur.length - 2, Math.floor(tt * (cur.length - 1)))
        const p = cur[k]
        const q = cur[k + 1]
        const ang = Math.atan2(q.y - p.y, q.x - p.x)
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(ang)
        ctx.fillStyle = '#3d78de'
        ctx.beginPath()
        ctx.moveTo(size * 0.035, 0)
        ctx.lineTo(-size * 0.02, -size * 0.022)
        ctx.lineTo(-size * 0.02, size * 0.022)
        ctx.closePath()
        ctx.fill()
        ctx.restore()

        // Chấm đánh số điểm đặt bút
        const st0 = cur[0]
        ctx.fillStyle = '#e84872'
        ctx.beginPath()
        ctx.arc(st0.x, st0.y, size * 0.04, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = `bold ${size * 0.045}px "Be Vietnam Pro", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(strokeIdx + 1), st0.x, st0.y + 1)
      }

      // Số thứ tự các nét sau (mờ)
      models.forEach((m, i) => {
        if (i <= strokeIdx) return
        ctx.fillStyle = dark ? 'rgba(255,255,255,0.3)' : 'rgba(52,48,44,0.3)'
        ctx.font = `bold ${size * 0.035}px "Be Vietnam Pro", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(i + 1), m[0].x, m[0].y)
      })

      // Nét đang vẽ
      drawInk(s.current, inkColor)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [char, size, models, strokeIdx, showGhost, charResult])

  /* ---------- Điều khiển phiên ---------- */
  const resetChar = () => {
    Object.assign(st.current, { ink: [], current: [], drawing: false, strokeScores: [], fails: 0 })
    setStrokeIdx(0)
    setCharResult(null)
    setMessage(null)
  }

  const start = () => {
    reset()
    const list = shuffle(usingSample ? Object.keys(STROKES) : inScope).slice(0, SESSION)
    setQueue(list)
    setIdx(0)
    setResults([])
    resetChar()
  }

  const exit = () => {
    clearTimeout(autoNext.current)
    reset()
    setQueue(null)
  }

  const nextChar = (scores = results) => {
    clearTimeout(autoNext.current)
    if (!queue) return
    if (idx + 1 >= queue.length) {
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
      finish(scores.reduce((a, b) => a + b, 0), avg >= 70, 0)
      return
    }
    setIdx(idx + 1)
    resetChar()
  }

  const completeChar = () => {
    const s = st.current
    const base = s.strokeScores.reduce((a, b) => a + b, 0) / s.strokeScores.length
    const score = Math.max(40, Math.min(100, Math.round(base - s.fails * 8)))
    const kana = KANA_BY_CHAR.get(char!)
    // Hoàn thành chữ: +10 EXP; ghi đúng/sai theo độ chuẩn xác.
    if (kana) {
      if (score >= 70) answer(kana.id, true, { silent: true })
      else {
        answer(kana.id, false, { silent: true })
        addExp(10)
      }
    }
    playSfx('win')
    speak(char!, { audioUrl: kana?.audioUrl })
    const nextResults = [...results, score]
    setResults(nextResults)
    setCharResult({ score })
    autoNext.current = setTimeout(() => nextChar(nextResults), 1800)
  }

  /* ---------- Nhập nét ---------- */
  const point = (e: RPointerEvent<HTMLCanvasElement>): P => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const onDown = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (charResult || strokeIdx >= strokes.length) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* một số trình duyệt cũ không hỗ trợ */
    }
    const s = st.current
    s.drawing = true
    s.lastT = performance.now()
    s.current = [{ ...point(e), w: size * 0.05 }]
    setMessage(null)
  }

  const onMove = (e: RPointerEvent<HTMLCanvasElement>) => {
    const s = st.current
    if (!s.drawing) return
    const p = point(e)
    const prev = s.current[s.current.length - 1]
    const now = performance.now()
    const v = dist(p, prev) / Math.max(1, now - s.lastT) // px/ms
    s.lastT = now
    // Nét bút lông: đi nhanh → mảnh, đi chậm → đậm.
    const w = size * 0.05 * Math.max(0.5, Math.min(1.15, 1.2 - v / 1.6))
    s.current.push({ ...p, w: prev ? prev.w * 0.6 + w * 0.4 : w })
  }

  const onUp = () => {
    const s = st.current
    if (!s.drawing) return
    s.drawing = false
    const res = validateStroke(s.current, models[strokeIdx], checkpoints[strokeIdx], tol)
    if (!res.ok) {
      s.fails++
      s.current = []
      s.failFlashUntil = performance.now() + 500
      playSfx('wrong')
      setMessage({ text: res.reason!, bad: true })
      return
    }
    s.ink.push(s.current)
    s.current = []
    s.strokeScores.push(100 - Math.min(40, (res.avg! / tol) * 35))
    playSfx('ting')
    if (strokeIdx + 1 >= strokes.length) completeChar()
    else {
      setStrokeIdx(strokeIdx + 1)
      setMessage({ text: `Đẹp! Tiếp nét ${strokeIdx + 2}`, bad: false })
    }
  }

  const kana = char ? KANA_BY_CHAR.get(char) : undefined
  const avg = results.length ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0

  return (
    <GameShell title="Tập viết nét" jp="書き順" active={!!queue} onExit={exit} minPool={0}>
      {!queue ? (
        <StartScreen
          icon="🖌️"
          onStart={start}
          desc={
            <>
              Tô theo <b>đúng thứ tự</b> và <b>đúng chiều</b> từng nét bút (Kakijun). Bắt đầu từ chấm đỏ có số, đi theo mũi
              tên xanh. Nét lệch hoặc ngược chiều sẽ bị xóa để viết lại. Mỗi chữ hoàn thành +10 EXP.
            </>
          }
        >
          <div className={cn('flex gap-2 rounded-2xl p-3 text-left text-sm', usingSample ? 'bg-yuzu-50 dark:bg-yuzu-500/10' : 'bg-matcha-50 dark:bg-matcha-500/10')}>
            <Info className={cn('size-5 shrink-0', usingSample ? 'text-yuzu-500' : 'text-matcha-500')} />
            <div>
              {usingSample
                ? 'Phạm vi học hiện tại chưa có chữ nào có dữ liệu nét – bạn sẽ luyện bộ chữ mẫu.'
                : `Có ${inScope.length} chữ trong phạm vi học có dữ liệu nét.`}
              <div className="mt-1 font-jp text-base tracking-wider">{(usingSample ? Object.keys(STROKES) : inScope).join(' ')}</div>
            </div>
          </div>
        </StartScreen>
      ) : (
        char && (
          <div className="mx-auto max-w-md">
            <div className="mb-2 flex justify-between text-sm font-semibold text-sumi-500">
              <span>Chữ {idx + 1}/{queue.length}</span>
              <span>Nét {Math.min(strokeIdx + 1, strokes.length)}/{strokes.length}</span>
            </div>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-sumi-100 dark:bg-sumi-800">
              <div className="h-full rounded-full bg-sumi-500 transition-all" style={{ width: `${(idx / queue.length) * 100}%` }} />
            </div>

            <div className="card mb-3 flex items-center gap-4 p-3">
              <div className="grid size-14 place-items-center rounded-2xl bg-sumi-100 font-jp text-4xl font-bold dark:bg-sumi-800">{char}</div>
              <div className="flex-1">
                <div className="text-2xl font-extrabold text-sakura-500">{kana?.romaji}</div>
                <div className="text-xs text-sumi-400">{strokes.length} nét · {kana?.type === 'katakana' ? 'Katakana' : 'Hiragana'}</div>
              </div>
              <button onClick={() => speak(char, { audioUrl: kana?.audioUrl })} className="grid size-11 place-items-center rounded-full bg-sora-100 text-sora-500 dark:bg-sora-500/20" aria-label="Nghe phát âm">
                <Volume2 className="size-5" />
              </button>
            </div>

            <div ref={wrapRef} className="relative mx-auto" style={{ maxWidth: 380 }}>
              <canvas
                ref={canvasRef}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                className="mx-auto block cursor-crosshair rounded-3xl border-2 border-sakura-200 bg-[#fffdf8] shadow-sm dark:border-sumi-700 dark:bg-sumi-900"
                style={{ width: size, height: size, touchAction: 'none' }}
              />
              {message && !charResult && (
                <div className={cn('pointer-events-none absolute inset-x-0 -bottom-3 mx-auto w-fit animate-pop rounded-full px-4 py-1.5 text-sm font-bold shadow', message.bad ? 'bg-sakura-500 text-white' : 'bg-matcha-500 text-white')}>
                  {message.text}
                </div>
              )}
              {charResult && (
                <div className="absolute inset-0 grid place-items-center rounded-3xl bg-white/70 backdrop-blur-sm dark:bg-sumi-950/60">
                  <div className="animate-pop text-center">
                    <div className="font-jp text-7xl font-bold">{char}</div>
                    <div className="mt-2 text-3xl font-extrabold text-matcha-500">{charResult.score}%</div>
                    <div className="text-lg font-bold">{grade(charResult.score)}</div>
                    <div className="mt-1 text-sm font-semibold text-fuji-500">+10 EXP</div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              <button className="btn-secondary px-2 text-sm" onClick={resetChar} disabled={!!charResult}>
                <RotateCcw className="size-4" /> Viết lại
              </button>
              <button className="btn-secondary px-2 text-sm" onClick={() => setShowGhost((v) => !v)}>
                {showGhost ? <EyeOff className="size-4" /> : <Eye className="size-4" />} {showGhost ? 'Ẩn mẫu' : 'Hiện mẫu'}
              </button>
              {charResult ? (
                <button className="btn-primary px-2 text-sm" onClick={() => nextChar(results)}>
                  Tiếp <ArrowRight className="size-4" />
                </button>
              ) : (
                <button className="btn-secondary px-2 text-sm" onClick={() => nextChar()}>
                  <SkipForward className="size-4" /> Bỏ qua
                </button>
              )}
            </div>
          </div>
        )
      )}

      <GameResult
        summary={summary}
        onReplay={start}
        reason={summary && !summary.won ? 'Điểm trung bình cần từ 70% trở lên.' : undefined}
        stats={[
          { label: 'Chữ đã viết', value: `${results.length}/${queue?.length ?? 0}` },
          { label: 'Điểm trung bình', value: `${avg}%` },
          { label: 'Hoàn hảo (≥95%)', value: results.filter((r) => r >= 95).length },
          { label: 'Đánh giá', value: results.length ? grade(avg) : '–' },
        ]}
      />
    </GameShell>
  )
}
