import { useMemo, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Award, Flame, Gamepad2, Star, Target, TrendingUp } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ALL_KANA, CATEGORY_LABELS } from '../data/kana'
import {
  accuracy, currentStreak, isMastered, isWeak, levelInfo, useProgressStore, type GameId,
} from '../store/useProgressStore'
import { useScopeStore } from '../store/useScopeStore'
import { useActivePool } from '../hooks/useActivePool'
import { cn, todayKey } from '../lib/utils'
import type { KanaCategory, Script } from '../types/kana'

const GAME_NAMES: Record<GameId, string> = {
  memory: 'Lật thẻ trí nhớ',
  falling: 'Ký tự rơi',
  audio: 'Thử thách thính giác',
  builder: 'Xếp chữ thành từ',
}

function StatCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: ReactNode; tone: string }) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', tone)}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-sumi-400">{label}</div>
        <div className="text-xl leading-tight font-extrabold tabular-nums sm:text-2xl">{value}</div>
      </div>
    </div>
  )
}

function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums text-sumi-400">
          {value}/{total} · {pct}%
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-sumi-100 dark:bg-sumi-800">
        <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { stats, exp, streak, lastActiveDate, gamesPlayed, bestScores, activity } = useProgressStore()
  const setOnlyMistakes = useScopeStore((s) => s.setOnlyMistakes)
  const { pool } = useActivePool()
  const navigate = useNavigate()
  const lv = levelInfo(exp)

  const data = useMemo(() => {
    let seen = 0, mastered = 0, correct = 0, total = 0
    const weak: { char: string; romaji: string; acc: number; id: string }[] = []
    const byScript: Record<Script, number> = { hiragana: 0, katakana: 0 }
    const byCat: Record<KanaCategory, [number, number]> = { seion: [0, 0], dakuon: [0, 0], handakuon: [0, 0], yoon: [0, 0] }
    for (const k of ALL_KANA) {
      const st = stats[k.id]
      byCat[k.category][1]++
      if (st && st.correct + st.incorrect > 0) {
        seen++
        correct += st.correct
        total += st.correct + st.incorrect
      }
      if (isMastered(st)) {
        mastered++
        byScript[k.type]++
        byCat[k.category][0]++
      }
      if (isWeak(st)) weak.push({ char: k.char, romaji: k.romaji, acc: accuracy(st)!, id: k.id })
    }
    weak.sort((a, b) => a.acc - b.acc)
    return { seen, mastered, weak, byScript, byCat, overall: total ? Math.round((correct / total) * 100) : 0 }
  }, [stats])

  const week = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push({ key: todayKey(d), label: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()], count: activity[todayKey(d)] ?? 0 })
    }
    const max = Math.max(10, ...days.map((d) => d.count))
    return { days, max }
  }, [activity])

  const perScript = ALL_KANA.length / 2

  return (
    <div>
      <PageHeader
        jp="おかえりなさい！"
        title="Tổng quan"
        subtitle="Theo dõi hành trình chinh phục Hiragana & Katakana của bạn."
        actions={
          <Link to="/arena" className="btn-primary">
            <Gamepad2 className="size-4" /> Vào Đấu trường
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard icon={<Star className="size-6 fill-current" />} label="Cấp độ" value={`Lv ${lv.level}`} tone="bg-fuji-100 text-fuji-500 dark:bg-fuji-500/15" />
        <StatCard icon={<Flame className="size-6 fill-current" />} label="Chuỗi ngày" value={`${currentStreak(streak, lastActiveDate)} ngày`} tone="bg-yuzu-100 text-yuzu-500 dark:bg-yuzu-500/15" />
        <StatCard icon={<Award className="size-6" />} label="Đã thuộc" value={`${data.mastered}/${ALL_KANA.length}`} tone="bg-matcha-100 text-matcha-500 dark:bg-matcha-500/15" />
        <StatCard icon={<Target className="size-6" />} label="Độ chính xác" value={`${data.overall}%`} tone="bg-sora-100 text-sora-500 dark:bg-sora-500/15" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
            <TrendingUp className="size-5 text-matcha-500" /> Tỷ lệ thuộc bài
          </h2>
          <p className="mb-4 text-sm text-sumi-400">
            Một chữ được tính "đã thuộc" khi trả lời đúng ≥ 3 lần với độ chính xác ≥ 80%. Đã luyện {data.seen} chữ.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Bar label="Hiragana ひらがな" value={data.byScript.hiragana} total={perScript} color="bg-gradient-to-r from-sakura-300 to-sakura-500" />
            <Bar label="Katakana カタカナ" value={data.byScript.katakana} total={perScript} color="bg-gradient-to-r from-sora-300 to-sora-500" />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {(Object.keys(data.byCat) as KanaCategory[]).map((c) => (
              <Bar key={c} label={`${CATEGORY_LABELS[c].vi} ${CATEGORY_LABELS[c].jp}`} value={data.byCat[c][0]} total={data.byCat[c][1]} color="bg-gradient-to-r from-matcha-300 to-matcha-500" />
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 text-lg font-bold">Hoạt động 7 ngày</h2>
          <div className="flex h-36 items-end gap-2">
            {week.days.map((d) => (
              <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div className="text-[10px] font-bold tabular-nums text-sumi-400">{d.count || ''}</div>
                <div className="flex w-full flex-1 items-end">
                <div
                  className={cn('w-full rounded-lg transition-all', d.count ? 'bg-gradient-to-t from-sakura-400 to-sakura-200' : 'bg-sumi-100 dark:bg-sumi-800')}
                  style={{ height: `${Math.max(6, (d.count / week.max) * 100)}%` }}
                  title={`${d.count} câu trả lời`}
                />
                </div>
                <div className="text-[11px] font-medium text-sumi-400">{d.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-sumi-100 pt-4 text-sm dark:border-sumi-800">
            <div className="flex justify-between"><span className="text-sumi-400">Ván đã chơi</span><b>{gamesPlayed}</b></div>
            {(Object.keys(GAME_NAMES) as GameId[]).map((g) => (
              <div key={g} className="mt-1 flex justify-between">
                <span className="text-sumi-400">{GAME_NAMES[g]}</span>
                <b className="tabular-nums">{bestScores[g] ?? '–'}</b>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Chữ hay sai</h2>
            <span className="text-sm text-sumi-400">{data.weak.length} chữ &lt; 60%</span>
          </div>
          {data.weak.length === 0 ? (
            <p className="rounded-2xl bg-matcha-50 p-4 text-sm text-matcha-600 dark:bg-matcha-500/10 dark:text-matcha-300">
              Chưa có chữ yếu nào. Chơi thêm vài ván để hệ thống nhận diện chữ khó nhớ nhé!
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {data.weak.slice(0, 16).map((w) => (
                  <div key={w.id} className="flex flex-col items-center rounded-2xl border border-sakura-200 bg-sakura-50 px-3 py-2 dark:border-sakura-500/30 dark:bg-sakura-500/10">
                    <span className="font-jp text-2xl font-bold">{w.char}</span>
                    <span className="text-[11px] text-sumi-400">{w.romaji} · {Math.round(w.acc * 100)}%</span>
                  </div>
                ))}
              </div>
              <button
                className="btn-primary mt-4"
                onClick={() => {
                  setOnlyMistakes(true)
                  navigate('/scope')
                }}
              >
                Ôn riêng chữ hay sai <ArrowRight className="size-4" />
              </button>
            </>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-lg font-bold">Phạm vi học hiện tại</h2>
          <div className="flex flex-wrap gap-1.5">
            {pool.slice(0, 40).map((k) => (
              <span key={k.id} className="grid size-9 place-items-center rounded-xl bg-sumi-100 font-jp text-lg dark:bg-sumi-800">{k.char}</span>
            ))}
            {pool.length > 40 && <span className="grid h-9 place-items-center px-2 text-sm text-sumi-400">+{pool.length - 40}</span>}
            {pool.length === 0 && <span className="text-sm text-sumi-400">Chưa chọn chữ nào.</span>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/scope" className="btn-secondary">Chỉnh phạm vi</Link>
            <Link to="/kana?mode=flashcard" className="btn-secondary">Học Flashcard</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
