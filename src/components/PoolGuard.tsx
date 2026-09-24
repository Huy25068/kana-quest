import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SlidersHorizontal, TriangleAlert } from 'lucide-react'
import { useActivePool } from '../hooks/useActivePool'
import { MIN_POOL_SIZE } from '../lib/scope'

export function PoolWarning({ count }: { count: number }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-yuzu-300 bg-yuzu-50 p-4 text-sm text-sumi-700 dark:border-yuzu-500/40 dark:bg-yuzu-500/10 dark:text-sumi-200">
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-yuzu-500" />
      <div>
        <b>Chưa đủ điều kiện tạo game.</b> Phạm vi học hiện có <b>{count}</b> chữ – cần tối thiểu {MIN_POOL_SIZE} chữ.
        {' '}Hãy mở rộng bảng chữ, nhóm âm hoặc hàng chữ (hoặc tắt bộ lọc "chữ hay sai").
      </div>
    </div>
  )
}

/** Chặn nội dung khi activeKanaPool không đủ chữ. */
export function PoolGuard({ children }: { children: ReactNode }) {
  const { pool, isPlayable } = useActivePool()
  if (isPlayable) return <>{children}</>
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <div className="mb-4 font-jp text-6xl">🤔</div>
      <PoolWarning count={pool.length} />
      <Link to="/scope" className="btn-primary mt-6">
        <SlidersHorizontal className="size-4" /> Chỉnh phạm vi học
      </Link>
    </div>
  )
}
