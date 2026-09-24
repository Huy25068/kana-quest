import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Layers, Lightbulb, RotateCcw, Shuffle, Table2, Volume2, X } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { KanaDetail } from '../components/KanaDetail'
import { PoolGuard } from '../components/PoolGuard'
import { GOJUON_GRID, KANA_BY_ID } from '../data/kana'
import { accuracy, useProgressStore } from '../store/useProgressStore'
import { useActivePool } from '../hooks/useActivePool'
import { playSfx, speak } from '../lib/audio'
import { cn, shuffle } from '../lib/utils'
import type { KanaItem, Script } from '../types/kana'

const VOWELS = ['a', 'i', 'u', 'e', 'o']

function accColor(acc: number | null) {
  if (acc === null) return 'bg-sumi-200 dark:bg-sumi-700'
  if (acc >= 0.8) return 'bg-matcha-400'
  if (acc >= 0.6) return 'bg-yuzu-400'
  return 'bg-sakura-400'
}

function KanaCell({ k, onOpen, small }: { k?: KanaItem; onOpen: (k: KanaItem) => void; small?: boolean }) {
  const stat = useProgressStore((s) => (k ? s.stats[k.id] : undefined))
  if (!k) return <div />
  return (
    <button
      onClick={() => {
        speak(k.char, { audioUrl: k.audioUrl })
        onOpen(k)
      }}
      className="group relative flex aspect-square flex-col items-center justify-center rounded-2xl border border-sumi-200/80 bg-white transition hover:-translate-y-0.5 hover:border-sakura-300 hover:shadow-md active:scale-95 dark:border-sumi-700 dark:bg-sumi-800 dark:hover:border-sakura-400"
    >
      <span className={cn('absolute top-1.5 right-1.5 size-1.5 rounded-full', accColor(accuracy(stat)))} />
      <span className={cn('font-jp font-bold leading-none', small ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-4xl')}>{k.char}</span>
      <span className="mt-1 text-[10px] font-semibold text-sumi-400 group-hover:text-sakura-500 sm:text-xs">{k.romaji}</span>
    </button>
  )
}

function Grid({ rows, script, cols, onOpen, header }: { rows: (string | null)[][]; script: Script; cols: number; onOpen: (k: KanaItem) => void; header?: string[] }) {
  const p = script === 'hiragana' ? 'hira' : 'kata'
  return (
    <div className="grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {header?.map((h) => (
        <div key={h} className="text-center text-xs font-bold uppercase text-sumi-400">{h}</div>
      ))}
      {rows.flatMap((r, i) =>
        r.map((key, j) => <KanaCell key={`${i}-${j}`} k={key ? KANA_BY_ID.get(`${p}_${key}`) : undefined} onOpen={onOpen} small={cols === 3} />),
      )}
    </div>
  )
}

/* ------------------------------ Flashcard ------------------------------ */

function Flashcards() {
  const { pool } = useActivePool()
  const recordAnswer = useProgressStore((s) => s.recordAnswer)
  const [deck, setDeck] = useState(() => shuffle(pool))
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [reverse, setReverse] = useState(false)
  const [known, setKnown] = useState(0)

  const card = deck[idx]
  const done = idx >= deck.length

  const restart = useCallback(() => {
    setDeck(shuffle(pool))
    setIdx(0)
    setKnown(0)
    setFlipped(false)
  }, [pool])

  const flip = useCallback(() => {
    if (!card) return
    playSfx('flip')
    if (!flipped) speak(card.char, { audioUrl: card.audioUrl })
    setFlipped(!flipped)
  }, [card, flipped])

  const grade = useCallback(
    (remembered: boolean) => {
      if (!card) return
      recordAnswer(card.id, remembered)
      if (remembered) setKnown((n) => n + 1)
      playSfx(remembered ? 'correct' : 'click')
      setFlipped(false)
      setTimeout(() => setIdx((i) => i + 1), 150)
    },
    [card, recordAnswer],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        flip()
      } else if (flipped && (e.key === 'ArrowRight' || e.key === '2')) grade(true)
      else if (flipped && (e.key === 'ArrowLeft' || e.key === '1')) grade(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flip, grade, flipped])

  if (done) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <div className="text-6xl">🎴</div>
        <h2 className="mt-3 text-2xl font-extrabold">Hoàn thành bộ thẻ!</h2>
        <p className="mt-2 text-sumi-500">
          Bạn nhớ <b className="text-matcha-500">{known}</b>/{deck.length} thẻ.
        </p>
        <button className="btn-primary mt-6" onClick={restart}>
          <RotateCcw className="size-4" /> Ôn lại
        </button>
      </div>
    )
  }

  const front = reverse ? (
    <span className="text-5xl font-extrabold text-sakura-500 sm:text-6xl">{card.romaji}</span>
  ) : (
    <span className="font-jp text-8xl font-bold sm:text-9xl">{card.char}</span>
  )

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-semibold tabular-nums text-sumi-500">
          Thẻ {idx + 1}/{deck.length}
        </span>
        <div className="flex items-center gap-2">
          <button className={cn('chip', reverse ? 'border-sora-300 bg-sora-50 text-sora-600 dark:bg-sora-500/10' : 'border-sumi-200 dark:border-sumi-700')} onClick={() => setReverse((r) => !r)}>
            <RotateCcw className="size-3.5" /> {reverse ? 'Romaji → Kana' : 'Kana → Romaji'}
          </button>
          <button className="chip border-sumi-200 dark:border-sumi-700" onClick={restart}>
            <Shuffle className="size-3.5" /> Trộn
          </button>
        </div>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-sumi-100 dark:bg-sumi-800">
        <div className="h-full rounded-full bg-sakura-400 transition-all" style={{ width: `${(idx / deck.length) * 100}%` }} />
      </div>

      <div className="perspective h-80 cursor-pointer select-none sm:h-96" onClick={flip}>
        <div className={cn('preserve-3d relative h-full w-full transition-transform duration-500', flipped && 'rotate-y-180')}>
          <div className="face backface-hidden absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-sumi-900">
            {front}
            <span className="mt-6 text-sm text-sumi-400">Chạm hoặc nhấn Space để lật</span>
          </div>
          <div className="face backface-hidden rotate-y-180 absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-sakura-50 to-sora-50 p-6 text-center dark:from-sumi-900 dark:to-sumi-800">
            <div className="flex items-baseline gap-3">
              <span className="font-jp text-6xl font-bold">{card.char}</span>
              <span className="text-3xl font-extrabold text-sakura-500">{card.romaji}</span>
            </div>
            <div className="mt-2 flex gap-2 text-left text-sm text-sumi-600 dark:text-sumi-300">
              <Lightbulb className="size-4 shrink-0 text-yuzu-500" />
              {card.mnemonicHint}
            </div>
            {card.exampleWord && (
              <div className="mt-2 rounded-2xl bg-white/70 px-4 py-2 text-sm dark:bg-sumi-950/50">
                <span className="font-jp text-lg font-bold">{card.exampleWord.kana}</span> · {card.exampleWord.romaji} – {card.exampleWord.meaningVi}
              </div>
            )}
            <button
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-sora-500"
              onClick={(e) => {
                e.stopPropagation()
                speak(card.char, { audioUrl: card.audioUrl })
              }}
            >
              <Volume2 className="size-4" /> Nghe lại
            </button>
          </div>
        </div>
      </div>

      <div className={cn('mt-5 grid grid-cols-2 gap-3 transition', !flipped && 'pointer-events-none opacity-40')}>
        <button className="btn-secondary py-3" onClick={() => grade(false)}>
          <X className="size-4 text-sakura-500" /> Chưa nhớ
        </button>
        <button className="btn-success py-3" onClick={() => grade(true)}>
          <Check className="size-4" /> Đã nhớ
        </button>
      </div>


    </div>
  )
}

/* ------------------------------ Page ------------------------------ */

export default function KanaChart() {
  const [params, setParams] = useSearchParams()
  const mode = params.get('mode') === 'flashcard' ? 'flashcard' : 'chart'
  const [script, setScript] = useState<Script>('hiragana')
  const [selected, setSelected] = useState<KanaItem | null>(null)

  return (
    <div>
      <PageHeader
        jp="五十音図"
        title="Bảng Kana & Flashcard"
        subtitle={mode === 'chart' ? 'Bấm vào từng chữ để nghe phát âm, xem mẹo nhớ và từ ví dụ.' : 'Học theo thẻ từ phạm vi học đã chọn.'}
        actions={
          <div className="flex rounded-2xl bg-sumi-100 p-1 dark:bg-sumi-800">
            {[
              { id: 'chart', label: 'Bảng tra', icon: Table2 },
              { id: 'flashcard', label: 'Flashcard', icon: Layers },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setParams(t.id === 'chart' ? {} : { mode: t.id }, { replace: true })}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition',
                  mode === t.id ? 'bg-white text-sakura-600 shadow-sm dark:bg-sumi-700 dark:text-sakura-300' : 'text-sumi-500',
                )}
              >
                <t.icon className="size-4" /> {t.label}
              </button>
            ))}
          </div>
        }
      />

      {mode === 'flashcard' ? (
        <PoolGuard>
          <Flashcards />
        </PoolGuard>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {(['hiragana', 'katakana'] as Script[]).map((s) => (
              <button
                key={s}
                onClick={() => setScript(s)}
                className={cn(
                  'chip text-base',
                  script === s
                    ? 'border-sakura-400 bg-sakura-500 text-white'
                    : 'border-sumi-200 bg-white text-sumi-600 dark:border-sumi-700 dark:bg-sumi-800 dark:text-sumi-300',
                )}
              >
                <span className="font-jp">{s === 'hiragana' ? 'ひらがな' : 'カタカナ'}</span> {s === 'hiragana' ? 'Hiragana' : 'Katakana'}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-3 text-xs text-sumi-400">
              <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-matcha-400" /> ≥80%</span>
              <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-yuzu-400" /> 60–80%</span>
              <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-sakura-400" /> &lt;60%</span>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
            <section className="card p-4 sm:p-5">
              <h2 className="mb-3 font-bold">Thanh âm <span className="font-jp text-sumi-400">清音</span></h2>
              <Grid rows={GOJUON_GRID.seion} script={script} cols={5} onOpen={setSelected} header={VOWELS} />
            </section>
            <div className="space-y-6">
              <section className="card p-4 sm:p-5">
                <h2 className="mb-3 font-bold">Biến âm & Bán biến âm <span className="font-jp text-sumi-400">濁音・半濁音</span></h2>
                <Grid rows={GOJUON_GRID.dakuon} script={script} cols={5} onOpen={setSelected} />
              </section>
              <section className="card p-4 sm:p-5">
                <h2 className="mb-3 font-bold">Ảo âm <span className="font-jp text-sumi-400">拗音</span></h2>
                <Grid rows={GOJUON_GRID.yoon} script={script} cols={3} onOpen={setSelected} header={['ya', 'yu', 'yo']} />
              </section>
            </div>
          </div>
        </>
      )}

      <KanaDetail kana={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
