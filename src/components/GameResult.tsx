import { useEffect } from 'react'
import { BookmarkPlus, RotateCcw, Sparkles, Trophy } from 'lucide-react'
import { KANA_BY_ID } from '../data/kana'
import { useReviewStore } from '../store/useReviewStore'
import { Modal } from './Modal'
import { celebrate } from '../lib/confetti'
import { useGoUp } from '../lib/navigation'
import type { GameSummary } from '../hooks/useGameSession'

interface Props {
  summary: GameSummary | null
  stats: { label: string; value: string | number }[]
  onReplay: () => void
  reason?: string
  /** Chữ trả lời sai trong ván – gợi ý thêm vào Sổ hay quên. */
  missed?: string[]
}

export function GameResult({ summary, stats, onReplay, reason, missed = [] }: Props) {
  const goUp = useGoUp()
  const reviewItems = useReviewStore((s) => s.items)
  const addReview = useReviewStore((s) => s.add)
  const notInReview = missed.filter((id) => !reviewItems[id])
  useEffect(() => {
    if (summary?.won) celebrate()
  }, [summary])

  if (!summary) return null
  return (
    <Modal open>
      <div className="text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-yuzu-100 dark:bg-yuzu-500/15">
          <Trophy className={summary.won ? 'size-10 text-yuzu-400' : 'size-10 text-sumi-300'} />
        </div>
        <h2 className="mt-4 text-2xl font-extrabold">{summary.won ? 'すごい! Xuất sắc!' : 'Ván đấu kết thúc'}</h2>
        {reason && <p className="mt-1 text-sm text-sumi-500">{reason}</p>}
        {summary.isRecord && summary.score > 0 && (
          <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-fuji-100 px-3 py-1 text-sm font-bold text-fuji-500 dark:bg-fuji-500/15">
            <Sparkles className="size-4" /> Kỷ lục mới!
          </div>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-sumi-50 p-3 dark:bg-sumi-800">
              <div className="text-xs font-medium text-sumi-400">{s.label}</div>
              <div className="text-xl font-extrabold tabular-nums">{s.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-sm font-bold text-fuji-500">+{summary.expGained} EXP</div>
        {missed.length > 0 && (
          <div className="mt-4 rounded-2xl bg-yuzu-50 p-3 text-left dark:bg-yuzu-500/10">
            <div className="text-xs font-bold text-sumi-500">Chữ bị sai trong ván này</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {missed.map((id) => {
                const k = KANA_BY_ID.get(id)
                return k ? (
                  <span key={id} title={k.romaji} className={'grid h-9 min-w-9 place-items-center rounded-xl px-1.5 font-jp text-lg ' + (reviewItems[id] ? 'bg-yuzu-200 dark:bg-yuzu-500/30' : 'bg-white dark:bg-sumi-800')}>
                    {k.char}
                  </span>
                ) : null
              })}
            </div>
            <button onClick={() => addReview(notInReview, 'game')} disabled={!notInReview.length} className="btn-secondary mt-3 w-full py-2 text-sm">
              <BookmarkPlus className="size-4 text-yuzu-500" />
              {notInReview.length ? `Thêm ${notInReview.length} chữ vào sổ hay quên` : 'Đã thêm vào sổ hay quên'}
            </button>
          </div>
        )}
        <div className="mt-6 flex gap-2">
          <button onClick={() => goUp('/arena')} className="btn-secondary flex-1">Về Đấu trường</button>
          <button onClick={onReplay} className="btn-primary flex-1">
            <RotateCcw className="size-4" /> Chơi lại
          </button>
        </div>
      </div>
    </Modal>
  )
}
