import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { PoolGuard } from './PoolGuard'
import { useActivePool } from '../hooks/useActivePool'
import { useBackToClose, useGoUp } from '../lib/navigation'

/** Khung chung cho mọi màn chơi: nút quay lại, tiêu đề, kiểm tra pool. */
interface ShellProps {
  title: string
  jp: string
  children: ReactNode
  /** Đang trong một ván (kể cả màn kết quả) → nút ← / Back đưa về màn chuẩn bị trước. */
  active?: boolean
  onExit?: () => void
}

export function GameShell({ title, jp, children, active = false, onExit }: ShellProps) {
  const { pool, config } = useActivePool()
  const goUp = useGoUp()
  useBackToClose(active, onExit ?? (() => {}))
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <button
          onClick={() => (active && onExit ? onExit() : goUp('/arena'))}
          className="grid size-10 place-items-center rounded-2xl bg-white shadow-sm hover:bg-sumi-100 dark:bg-sumi-800 dark:hover:bg-sumi-700"
          aria-label={active ? 'Thoát ván' : 'Về Đấu trường'}
          title={active ? 'Thoát ván' : 'Về Đấu trường'}
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex-1">
          <div className="font-jp text-xs text-sakura-400">{jp}</div>
          <h1 className="text-xl font-extrabold sm:text-2xl">{title}</h1>
        </div>
        <Link
          to={config.onlyReviewList ? '/kana?mode=review' : '/scope'}
          className={
            config.onlyReviewList
              ? 'chip border-yuzu-300 bg-yuzu-50 text-yuzu-500 dark:border-yuzu-500/40 dark:bg-yuzu-500/10'
              : 'chip border-sumi-200 bg-white text-sumi-500 hover:border-sakura-300 dark:border-sumi-700 dark:bg-sumi-800'
          }
        >
          {config.onlyReviewList ? `🔖 Sổ hay quên · ${pool.length}` : `${pool.length} chữ`}
        </Link>
      </div>
      <PoolGuard>{children}</PoolGuard>
    </div>
  )
}

export function StartScreen({ icon, desc, children, onStart, disabled }: { icon: string; desc: ReactNode; children?: ReactNode; onStart: () => void; disabled?: boolean }) {
  return (
    <div className="card mx-auto max-w-xl p-6 text-center sm:p-8">
      <div className="text-6xl">{icon}</div>
      <div className="mt-4 text-sumi-600 dark:text-sumi-300">{desc}</div>
      {children && <div className="mt-6">{children}</div>}
      <button className="btn-primary mt-6 w-full py-3.5 text-lg" onClick={onStart} disabled={disabled}>
        Bắt đầu
      </button>
    </div>
  )
}
