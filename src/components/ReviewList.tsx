import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bookmark, Gamepad2, Layers, Trash, X, Zap } from 'lucide-react'
import { KANA_BY_ID } from '../data/kana'
import { accuracy, useProgressStore } from '../store/useProgressStore'
import { useReviewStore, type ReviewSource } from '../store/useReviewStore'
import { useScopeStore } from '../store/useScopeStore'
import { MIN_POOL_SIZE } from '../lib/scope'
import { cn } from '../lib/utils'
import type { KanaItem, Script } from '../types/kana'

const SOURCE_LABEL: Record<ReviewSource, string> = {
  manual: 'Tự thêm',
  flashcard: 'Flashcard',
  game: 'Game',
}

/** Tab "Sổ hay quên": danh sách chữ người dùng muốn luyện thêm. */
export function ReviewList({ onOpen, onStudyFlashcard }: { onOpen: (k: KanaItem) => void; onStudyFlashcard: () => void }) {
  const items = useReviewStore((s) => s.items)
  const remove = useReviewStore((s) => s.remove)
  const clear = useReviewStore((s) => s.clear)
  const stats = useProgressStore((s) => s.stats)
  const onlyReview = useScopeStore((s) => !!s.config.onlyReviewList)
  const setOnlyReview = useScopeStore((s) => s.setOnlyReviewList)
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'all' | Script>('all')

  const list = useMemo(
    () =>
      Object.entries(items)
        .map(([id, info]) => ({ kana: KANA_BY_ID.get(id), info }))
        .filter((x): x is { kana: KanaItem; info: (typeof items)[string] } => !!x.kana)
        .sort((a, b) => b.info.addedAt - a.info.addedAt),
    [items],
  )
  const shown = list.filter((x) => filter === 'all' || x.kana.type === filter)

  const practice = (where: 'flashcard' | 'arena') => {
    setOnlyReview(true)
    if (where === 'flashcard') onStudyFlashcard()
    else navigate('/arena')
  }

  if (!list.length) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <Bookmark className="mx-auto size-14 text-yuzu-300" />
        <h2 className="mt-3 text-xl font-extrabold">Sổ hay quên đang trống</h2>
        <ul className="mx-auto mt-4 max-w-sm space-y-2 text-left text-sm text-sumi-500 dark:text-sumi-400">
          <li>🔖 Bấm vào chữ bất kỳ trong <b>Bảng tra</b> → <b>Thêm vào sổ hay quên</b>.</li>
          <li>🎴 Khi học <b>Flashcard</b>, chữ nào bấm <b>Chưa nhớ</b> sẽ tự vào sổ.</li>
          <li>🎮 Sau mỗi ván game, thêm nhanh các chữ bị sai.</li>
        </ul>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {onlyReview && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-yuzu-300 bg-yuzu-50 p-4 text-sm dark:border-yuzu-500/40 dark:bg-yuzu-500/10">
          <Zap className="size-5 text-yuzu-500" />
          <div className="flex-1">
            <b>Đang luyện riêng Sổ hay quên.</b> Flashcard và 4 mini-game chỉ lấy {list.length} chữ trong sổ.
          </div>
          <button className="btn-secondary py-1.5 text-sm" onClick={() => setOnlyReview(false)}>
            Tắt, học theo phạm vi
          </button>
        </div>
      )}

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="mr-auto">
          <div className="text-3xl font-extrabold tabular-nums text-yuzu-500">{list.length}</div>
          <div className="text-sm text-sumi-500">chữ cần luyện thêm</div>
        </div>
        <button className="btn-primary" onClick={() => practice('flashcard')}>
          <Layers className="size-4" /> Học Flashcard
        </button>
        <button className="btn-secondary" onClick={() => practice('arena')} disabled={list.length < MIN_POOL_SIZE} title={list.length < MIN_POOL_SIZE ? `Cần ít nhất ${MIN_POOL_SIZE} chữ để chơi game` : undefined}>
          <Gamepad2 className="size-4" /> Luyện bằng game
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'hiragana', 'katakana'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn('chip', filter === f ? 'border-yuzu-400 bg-yuzu-400 text-white' : 'border-sumi-200 bg-white text-sumi-600 dark:border-sumi-700 dark:bg-sumi-800 dark:text-sumi-300')}
          >
            {f === 'all' ? 'Tất cả' : f === 'hiragana' ? 'Hiragana' : 'Katakana'}
          </button>
        ))}
        <button
          className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-sakura-500 hover:underline"
          onClick={() => confirm('Xóa toàn bộ Sổ hay quên?') && (clear(), setOnlyReview(false))}
        >
          <Trash className="size-4" /> Xóa hết
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {shown.map(({ kana, info }) => {
          const acc = accuracy(stats[kana.id])
          return (
            <div key={kana.id} className="group relative">
              <button
                onClick={() => onOpen(kana)}
                className="flex w-full flex-col items-center rounded-2xl border-2 border-yuzu-200 bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-md dark:border-yuzu-500/30 dark:bg-sumi-800"
              >
                <span className="font-jp text-4xl font-bold">{kana.char}</span>
                <span className="mt-1 text-sm font-bold text-sakura-500">{kana.romaji}</span>
                <span className="mt-1 text-[11px] text-sumi-400">
                  {acc === null ? 'Chưa luyện' : `Đúng ${Math.round(acc * 100)}%`} · {SOURCE_LABEL[info.source]}
                </span>
              </button>
              <button
                onClick={() => remove(kana.id)}
                className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full border border-sumi-200 bg-white text-sumi-400 shadow-sm hover:bg-sakura-50 hover:text-sakura-500 dark:border-sumi-600 dark:bg-sumi-700"
                aria-label={`Bỏ ${kana.char} khỏi sổ`}
                title="Bỏ khỏi sổ (đã nhớ)"
              >
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
