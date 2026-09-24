import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, Gamepad2, Layers, RotateCcw, Zap } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { PoolWarning } from '../components/PoolGuard'
import { ALL_KANA, CATEGORY_LABELS, ROWS } from '../data/kana'
import { useScopeStore } from '../store/useScopeStore'
import { isWeak, useProgressStore } from '../store/useProgressStore'
import { useActivePool } from '../hooks/useActivePool'
import { cn } from '../lib/utils'
import type { KanaCategory, Script } from '../types/kana'

const SCRIPT_OPTIONS: { value: Script[]; label: string; jp: string }[] = [
  { value: ['hiragana'], label: 'Chỉ Hiragana', jp: 'ひらがな' },
  { value: ['katakana'], label: 'Chỉ Katakana', jp: 'カタカナ' },
  { value: ['hiragana', 'katakana'], label: 'Trộn cả hai', jp: 'ひ＋カ' },
]

const CAT_TONE: Record<KanaCategory, string> = {
  seion: 'peer-checked:border-sakura-400 peer-checked:bg-sakura-50 dark:peer-checked:bg-sakura-500/10',
  dakuon: 'peer-checked:border-sora-400 peer-checked:bg-sora-50 dark:peer-checked:bg-sora-500/10',
  handakuon: 'peer-checked:border-fuji-400 peer-checked:bg-fuji-50 dark:peer-checked:bg-fuji-500/10',
  yoon: 'peer-checked:border-matcha-400 peer-checked:bg-matcha-50 dark:peer-checked:bg-matcha-500/10',
}

function Section({ step, title, children, aside }: { step: number; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-7 place-items-center rounded-full bg-sakura-500 text-sm font-bold text-white">{step}</span>
        <h2 className="flex-1 text-lg font-bold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

export default function StudyScope() {
  const { config, setScripts, toggleCategory, toggleRow, setRows, setOnlyMistakes, reset } = useScopeStore()
  const stats = useProgressStore((s) => s.stats)
  const { pool, isPlayable } = useActivePool()

  const sample = (row: string) => {
    const script = config.scripts[0] ?? 'hiragana'
    return ALL_KANA.find((k) => k.row === row && k.type === script)?.char
  }
  const weakCount = useMemo(() => ALL_KANA.filter((k) => isWeak(stats[k.id])).length, [stats])
  const scriptKey = config.scripts.slice().sort().join()

  return (
    <div>
      <PageHeader
        jp="学習範囲"
        title="Tùy chọn phạm vi học"
        subtitle="Tùy biến 100% nội dung – Flashcard và mọi mini-game sẽ tự động dùng danh sách chữ này."
        actions={
          <button className="btn-secondary" onClick={reset}>
            <RotateCcw className="size-4" /> Mặc định
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Section step={1} title="Bảng chữ cái">
            <div className="grid grid-cols-3 gap-3">
              {SCRIPT_OPTIONS.map((o) => {
                const active = o.value.slice().sort().join() === scriptKey
                return (
                  <button
                    key={o.label}
                    onClick={() => setScripts(o.value)}
                    className={cn(
                      'rounded-2xl border-2 p-3 text-center transition sm:p-4',
                      active ? 'border-sakura-400 bg-sakura-50 dark:bg-sakura-500/10' : 'border-sumi-200 hover:border-sakura-200 dark:border-sumi-700',
                    )}
                  >
                    <div className="font-jp text-xl font-bold sm:text-2xl">{o.jp}</div>
                    <div className="mt-1 text-xs font-semibold text-sumi-500 sm:text-sm">{o.label}</div>
                  </button>
                )
              })}
            </div>
          </Section>

          <Section step={2} title="Nhóm âm">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {(Object.keys(CATEGORY_LABELS) as KanaCategory[]).map((c) => (
                <label key={c} className="cursor-pointer">
                  <input type="checkbox" className="peer sr-only" checked={config.categories[c]} onChange={() => toggleCategory(c)} />
                  <div className={cn('relative h-full rounded-2xl border-2 border-sumi-200 p-3 transition dark:border-sumi-700', CAT_TONE[c])}>
                    <div className={cn('absolute top-2 right-2 grid size-5 place-items-center rounded-md border', config.categories[c] ? 'border-transparent bg-sakura-500 text-white' : 'border-sumi-300 dark:border-sumi-600')}>
                      {config.categories[c] && <Check className="size-3.5" />}
                    </div>
                    <div className="font-jp text-sm text-sumi-400">{CATEGORY_LABELS[c].jp}</div>
                    <div className="font-bold">{CATEGORY_LABELS[c].vi}</div>
                    <div className="mt-1 text-xs text-sumi-500">{CATEGORY_LABELS[c].desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </Section>

          <Section step={3} title="Chọn chi tiết từng hàng">
            <div className="space-y-4">
              {(Object.keys(CATEGORY_LABELS) as KanaCategory[]).map((c) => {
                const rows = ROWS.filter((r) => r.category === c)
                const ids = rows.map((r) => r.id)
                const enabled = config.categories[c]
                const allOn = ids.every((id) => config.selectedRows.includes(id))
                return (
                  <div key={c} className={cn(!enabled && 'opacity-40')}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-sumi-500">
                        {CATEGORY_LABELS[c].vi} {!enabled && '(đang tắt)'}
                      </span>
                      <button disabled={!enabled} className="text-xs font-semibold text-sakura-500 hover:underline disabled:no-underline" onClick={() => setRows(ids, !allOn)}>
                        {allOn ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {rows.map((r) => {
                        const on = config.selectedRows.includes(r.id)
                        return (
                          <button
                            key={r.id}
                            disabled={!enabled}
                            onClick={() => toggleRow(r.id)}
                            className={cn(
                              'chip',
                              on
                                ? 'border-sakura-400 bg-sakura-500 text-white'
                                : 'border-sumi-200 bg-white text-sumi-600 hover:border-sakura-300 dark:border-sumi-700 dark:bg-sumi-800 dark:text-sumi-300',
                            )}
                          >
                            <span className="font-jp">{sample(r.id)}</span>
                            {r.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>

          <Section step={4} title="Bộ lọc thông minh">
            <label className="flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-sumi-200 p-4 transition has-[:checked]:border-yuzu-400 has-[:checked]:bg-yuzu-50 dark:border-sumi-700 dark:has-[:checked]:bg-yuzu-500/10">
              <Zap className="size-6 shrink-0 text-yuzu-500" />
              <div className="flex-1">
                <div className="font-bold">Chỉ ôn chữ hay sai (Weak Kana)</div>
                <div className="text-sm text-sumi-500">
                  Lấy các chữ có tỷ lệ đúng &lt; 60% từ lịch sử làm bài. Hiện có <b>{weakCount}</b> chữ yếu.
                </div>
              </div>
              <input type="checkbox" className="peer sr-only" checked={config.onlyMistakes} onChange={(e) => setOnlyMistakes(e.target.checked)} />
              <span className="relative h-7 w-12 shrink-0 rounded-full bg-sumi-200 transition peer-checked:bg-yuzu-400 after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5 dark:bg-sumi-700" />
            </label>
          </Section>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5">
            <div className="text-sm font-semibold text-sumi-400">Active Kana Pool</div>
            <div className={cn('text-5xl font-extrabold tabular-nums', isPlayable ? 'text-matcha-500' : 'text-yuzu-500')}>{pool.length}</div>
            <div className="text-sm text-sumi-500">chữ được kích hoạt</div>
            <div className="mt-4 flex max-h-64 flex-wrap gap-1.5 overflow-y-auto">
              {pool.map((k) => (
                <span key={k.id} title={k.romaji} className="grid h-9 min-w-9 place-items-center rounded-xl bg-sumi-100 px-1.5 font-jp text-lg dark:bg-sumi-800">
                  {k.char}
                </span>
              ))}
            </div>
            <div className="mt-4">
              {isPlayable ? (
                <div className="flex flex-col gap-2">
                  <Link to="/arena" className="btn-primary">
                    <Gamepad2 className="size-4" /> Vào Đấu trường
                  </Link>
                  <Link to="/kana?mode=flashcard" className="btn-secondary">
                    <Layers className="size-4" /> Học Flashcard
                  </Link>
                </div>
              ) : (
                <PoolWarning count={pool.length} />
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
