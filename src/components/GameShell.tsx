import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { PoolGuard } from './PoolGuard'
import { useActivePool } from '../hooks/useActivePool'

/** Khung chung cho mọi màn chơi: nút quay lại, tiêu đề, kiểm tra pool. */
export function GameShell({ title, jp, children }: { title: string; jp: string; children: ReactNode }) {
  const { pool } = useActivePool()
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <Link to="/arena" className="grid size-10 place-items-center rounded-2xl bg-white shadow-sm hover:bg-sumi-100 dark:bg-sumi-800 dark:hover:bg-sumi-700" aria-label="Quay lại">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <div className="font-jp text-xs text-sakura-400">{jp}</div>
          <h1 className="text-xl font-extrabold sm:text-2xl">{title}</h1>
        </div>
        <Link to="/scope" className="chip border-sumi-200 bg-white text-sumi-500 hover:border-sakura-300 dark:border-sumi-700 dark:bg-sumi-800">
          {pool.length} chữ
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
