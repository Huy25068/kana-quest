import { useMemo, useState, type DragEvent } from 'react'
import { ArrowRight, Info, Lightbulb, Undo2, Volume2 } from 'lucide-react'
import { GameShell, StartScreen } from '../../components/GameShell'
import { GameResult } from '../../components/GameResult'
import { KANA_BY_CHAR } from '../../data/kana'
import { HELPER_TOKENS, WORDS } from '../../data/words'
import { useActivePool } from '../../hooks/useActivePool'
import { useGameSession } from '../../hooks/useGameSession'
import { playSfx, speak } from '../../lib/audio'
import { cn, sample, shuffle } from '../../lib/utils'
import type { KanaItem, ScopeConfig, WordEntry } from '../../types/kana'

const ROUNDS = 8

interface Tile {
  uid: number
  char: string
}
interface Round {
  word: WordEntry
  tiles: Tile[]
}

/** Chọn từ vựng ghép được hoàn toàn từ activeKanaPool; nếu thiếu thì nới lỏng theo mức độ phủ. */
function pickWords(pool: KanaItem[], config: ScopeConfig) {
  const chars = new Set(pool.map((k) => k.char))
  const inScript = WORDS.filter((w) => config.scripts.includes(w.script))
  const coverage = (w: WordEntry) => w.tokens.filter((t) => chars.has(t) || HELPER_TOKENS.has(t)).length / w.tokens.length
  const full = inScript.filter((w) => coverage(w) === 1)
  if (full.length >= 3) return { words: full, relaxed: false }
  const partial = inScript.filter((w) => coverage(w) > 0).sort((a, b) => coverage(b) - coverage(a))
  return { words: partial.length >= 3 ? partial.slice(0, Math.max(ROUNDS, full.length)) : inScript, relaxed: true }
}

function buildRounds(words: WordEntry[], pool: KanaItem[]): Round[] {
  let uid = 0
  const list: WordEntry[] = []
  while (list.length < ROUNDS) list.push(...sample(words, Math.min(ROUNDS - list.length, words.length)))
  return list.map((word) => {
    const extra = sample(
      pool.filter((k) => k.type === word.script && !word.tokens.includes(k.char)).map((k) => k.char),
      word.tokens.length >= 4 ? 1 : 2,
    )
    return { word, tiles: shuffle([...word.tokens, ...extra].map((char) => ({ uid: uid++, char }))) }
  })
}

const idsOf = (w: WordEntry) => w.tokens.map((t) => KANA_BY_CHAR.get(t)?.id).filter((x): x is string => !!x)

export default function WordBuilder() {
  const { pool, config } = useActivePool()
  const { answer, finish, reset, summary } = useGameSession('builder')
  const { words, relaxed } = useMemo(() => pickWords(pool, config), [pool, config])
  const [rounds, setRounds] = useState<Round[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [placed, setPlaced] = useState<number[]>([])
  const [result, setResult] = useState<'right' | 'wrong' | null>(null)
  const [hints, setHints] = useState(0)
  const [score, setScore] = useState(0)
  const [solved, setSolved] = useState(0)
  const [dragUid, setDragUid] = useState<number | null>(null)

  const round = rounds?.[idx]
  const tileByUid = (u: number) => round!.tiles.find((t) => t.uid === u)!

  const start = () => {
    reset()
    setRounds(buildRounds(words, pool))
    setIdx(0)
    setPlaced([])
    setResult(null)
    setHints(0)
    setScore(0)
    setSolved(0)
  }

  const exit = () => {
    reset()
    setRounds(null)
  }

  const check = (next: number[], usedHints = hints) => {
    if (!round || next.length !== round.word.tokens.length) return
    const built = next.map((u) => tileByUid(u).char).join('')
    const ok = built === round.word.tokens.join('')
    setResult(ok ? 'right' : 'wrong')
    answer(idsOf(round.word), ok)
    if (ok) {
      setSolved((s) => s + 1)
      setScore((s) => s + Math.max(20, 100 - usedHints * 30))
      setTimeout(() => speak(round.word.tokens.join('')), 250)
    }
  }

  const place = (u: number, at?: number) => {
    if (result || !round) return
    playSfx('click')
    const without = placed.filter((p) => p !== u)
    const next = at === undefined ? [...without, u] : [...without.slice(0, at), u, ...without.slice(at)]
    setPlaced(next)
    check(next)
  }
  const unplace = (u: number) => {
    if (result) return
    playSfx('click')
    setPlaced(placed.filter((p) => p !== u))
  }

  const hint = () => {
    if (!round || result) return
    // Đặt đúng khối tiếp theo (giữ lại phần đúng ở đầu).
    const target = round.word.tokens
    let correctPrefix = 0
    while (correctPrefix < placed.length && tileByUid(placed[correctPrefix]).char === target[correctPrefix]) correctPrefix++
    const keep = placed.slice(0, correctPrefix)
    const tile = round.tiles.find((t) => t.char === target[correctPrefix] && !keep.includes(t.uid))
    if (!tile) return
    const next = [...keep, tile.uid]
    setHints(hints + 1)
    setPlaced(next)
    playSfx('flip')
    check(next, hints + 1)
  }

  const next = () => {
    if (idx + 1 >= ROUNDS) return finish(score, solved >= ROUNDS * 0.6)
    setIdx(idx + 1)
    setPlaced([])
    setResult(null)
    setHints(0)
  }

  const onDropAnswer = (e: DragEvent, at?: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (dragUid !== null) place(dragUid, at)
    setDragUid(null)
  }
  const onDropBank = (e: DragEvent) => {
    e.preventDefault()
    if (dragUid !== null && placed.includes(dragUid)) unplace(dragUid)
    setDragUid(null)
  }

  const tileCls = 'grid size-14 place-items-center rounded-2xl border-2 font-jp text-3xl font-bold shadow-[0_3px_0] transition active:translate-y-0.5 active:shadow-none sm:size-16'

  return (
    <GameShell title="Xếp chữ thành từ" jp="言葉づくり" active={rounds !== null} onExit={exit}>
      {!rounds ? (
        <StartScreen
          icon="🧩"
          onStart={start}
          disabled={words.length === 0}
          desc={
            <>
              Đọc nghĩa tiếng Việt và romaji, sau đó <b>bấm</b> hoặc <b>kéo thả</b> các khối Kana theo đúng thứ tự.
              Ví dụ: Hoa anh đào – sakura → <span className="font-jp font-bold">さ → く → ら</span>. {ROUNDS} từ mỗi ván.
            </>
          }
        >
          <div className={cn('flex gap-2 rounded-2xl p-3 text-left text-sm', relaxed ? 'bg-yuzu-50 dark:bg-yuzu-500/10' : 'bg-matcha-50 dark:bg-matcha-500/10')}>
            <Info className={cn('size-5 shrink-0', relaxed ? 'text-yuzu-500' : 'text-matcha-500')} />
            {relaxed
              ? 'Phạm vi hiện tại hơi hẹp nên chưa ghép đủ từ – một số từ sẽ chứa chữ ngoài phạm vi học. Mở rộng phạm vi để có nhiều từ hơn!'
              : `Có ${words.length} từ vựng ghép được hoàn toàn từ phạm vi học của bạn.`}
          </div>
        </StartScreen>
      ) : (
        round && (
          <div className="mx-auto max-w-xl">
            <div className="mb-2 flex justify-between text-sm font-semibold text-sumi-500">
              <span>Từ {idx + 1}/{ROUNDS}</span>
              <span className="tabular-nums">Điểm: {score}</span>
            </div>
            <div className="mb-5 h-2 overflow-hidden rounded-full bg-sumi-100 dark:bg-sumi-800">
              <div className="h-full rounded-full bg-matcha-400 transition-all" style={{ width: `${(idx / ROUNDS) * 100}%` }} />
            </div>

            <div className="card p-6 text-center">
              <div className="text-sm font-semibold text-sumi-400">Nghĩa tiếng Việt</div>
              <div className="mt-1 text-3xl font-extrabold">{round.word.meaningVi}</div>
              <div className="mt-1 text-lg font-bold tracking-wide text-sakura-500">{round.word.romaji}</div>

              {/* Ô trả lời */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDropAnswer(e)}
                className={cn(
                  'mt-6 flex min-h-24 flex-wrap items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-3 transition',
                  result === 'right' && 'animate-pop border-matcha-400 bg-matcha-50 dark:bg-matcha-500/10',
                  result === 'wrong' && 'animate-shake border-sakura-400 bg-sakura-50 dark:bg-sakura-500/10',
                  !result && 'border-sumi-300 dark:border-sumi-600',
                )}
              >
                {round.word.tokens.map((_, i) => {
                  const u = placed[i]
                  return u === undefined ? (
                    <div key={`e${i}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDropAnswer(e, i)} className="size-14 rounded-2xl bg-sumi-100 sm:size-16 dark:bg-sumi-800" />
                  ) : (
                    <button
                      key={u}
                      draggable={!result}
                      onDragStart={() => setDragUid(u)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => onDropAnswer(e, i)}
                      onClick={() => unplace(u)}
                      className={cn(tileCls, 'border-sakura-300 bg-sakura-50 text-sumi-800 shadow-sakura-200 dark:bg-sakura-500/20 dark:text-sumi-50 dark:shadow-sakura-500/30')}
                    >
                      {tileByUid(u).char}
                    </button>
                  )
                })}
              </div>

              {result === 'wrong' && (
                <div className="mt-3 text-sm">
                  Đáp án đúng: <span className="font-jp text-xl font-bold text-matcha-600">{round.word.tokens.join(' → ')}</span>
                </div>
              )}
              {result === 'right' && (
                <button onClick={() => speak(round.word.tokens.join(''))} className="mt-3 inline-flex items-center gap-2 font-jp text-xl font-bold text-matcha-600">
                  <Volume2 className="size-5" /> {round.word.tokens.join('')} {round.word.kanji && <span className="text-sumi-400">（{round.word.kanji}）</span>}
                </button>
              )}
            </div>

            {/* Khối chữ */}
            <div onDragOver={(e) => e.preventDefault()} onDrop={onDropBank} className="mt-5 flex min-h-20 flex-wrap justify-center gap-2 sm:gap-3">
              {round.tiles.map((t) => {
                const used = placed.includes(t.uid)
                return (
                  <button
                    key={t.uid}
                    disabled={used || !!result}
                    draggable={!used && !result}
                    onDragStart={() => setDragUid(t.uid)}
                    onClick={() => place(t.uid)}
                    className={cn(
                      tileCls,
                      used
                        ? 'border-transparent bg-sumi-100 text-transparent shadow-transparent dark:bg-sumi-800'
                        : 'cursor-grab border-sumi-200 bg-white shadow-sumi-200 hover:-translate-y-0.5 hover:border-sakura-300 dark:border-sumi-600 dark:bg-sumi-700 dark:shadow-sumi-900',
                    )}
                  >
                    {t.char}
                  </button>
                )
              })}
            </div>

            <div className="mt-6 flex gap-2">
              {result ? (
                <button onClick={next} className="btn-primary flex-1 py-3">
                  {idx + 1 >= ROUNDS ? 'Xem kết quả' : 'Từ tiếp theo'} <ArrowRight className="size-4" />
                </button>
              ) : (
                <>
                  <button onClick={() => setPlaced([])} disabled={!placed.length} className="btn-secondary flex-1">
                    <Undo2 className="size-4" /> Xóa hết
                  </button>
                  <button onClick={hint} className="btn-secondary flex-1">
                    <Lightbulb className="size-4 text-yuzu-500" /> Gợi ý (−30)
                  </button>
                </>
              )}
            </div>
          </div>
        )
      )}

      <GameResult
        summary={summary}
        onReplay={start}
        reason={summary && !summary.won ? 'Cần xếp đúng ít nhất 60% số từ.' : undefined}
        stats={[
          { label: 'Điểm', value: score },
          { label: 'Xếp đúng', value: `${solved}/${ROUNDS}` },
          { label: 'Xếp sai', value: ROUNDS - solved },
          { label: 'Tỷ lệ đúng', value: `${Math.round((solved / ROUNDS) * 100)}%` },
        ]}
      />
    </GameShell>
  )
}
