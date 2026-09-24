import { useEffect } from 'react'
import { RotateCcw, Sparkles, Trophy } from 'lucide-react'
import { Modal } from './Modal'
import { celebrate } from '../lib/confetti'
import { useGoUp } from '../lib/navigation'
import type { GameSummary } from '../hooks/useGameSession'

interface Props {
  summary: GameSummary | null
  stats: { label: string; value: string | number }[]
  onReplay: () => void
  reason?: string
}

export function GameResult({ summary, stats, onReplay, reason }: Props) {
  const goUp = useGoUp()
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
