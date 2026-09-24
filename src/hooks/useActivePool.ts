import { useMemo } from 'react'
import { useScopeStore } from '../store/useScopeStore'
import { useProgressStore } from '../store/useProgressStore'
import { useReviewStore } from '../store/useReviewStore'
import { buildKanaPool, MIN_POOL_SIZE } from '../lib/scope'

/** activeKanaPool dùng chung cho Flashcard và mọi mini-game. */
export function useActivePool() {
  const config = useScopeStore((s) => s.config)
  const stats = useProgressStore((s) => s.stats)
  const reviewItems = useReviewStore((s) => s.items)
  const pool = useMemo(() => buildKanaPool(config, stats, new Set(Object.keys(reviewItems))), [config, stats, reviewItems])
  return { pool, config, isPlayable: pool.length >= MIN_POOL_SIZE }
}
