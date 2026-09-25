import { Link } from 'react-router-dom'
import { Ear, Hammer, MousePointerClick, PenLine, Puzzle, SlidersHorizontal, Swords, Trophy, Zap, type LucideIcon } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { PoolWarning } from '../components/PoolGuard'
import { useActivePool } from '../hooks/useActivePool'
import { useProgressStore, type GameId } from '../store/useProgressStore'
import { cn } from '../lib/utils'

interface GameCard {
  id: GameId
  path: string
  title: string
  jp: string
  desc: string
  icon: LucideIcon
  tone: string
  skill: string
  /** Không cần đủ 4 chữ trong phạm vi (vd Tập viết có dữ liệu riêng). */
  anyPool?: boolean
}

export const GAMES: GameCard[] = [
  { id: 'memory', path: '/arena/memory', title: 'Lật thẻ trí nhớ', jp: '神経衰弱', desc: 'Lật thẻ 3D, ghép Kana với Romaji hoặc Hiragana với Katakana.', icon: MousePointerClick, tone: 'from-sakura-200 to-sakura-400', skill: 'Nhận diện' },
  { id: 'falling', path: '/arena/falling', title: 'Ký tự rơi tự do', jp: '落ちるかな', desc: 'Gõ romaji hoặc chọn đáp án trước khi chữ chạm vạch đỏ. Combo nhân điểm!', icon: Zap, tone: 'from-yuzu-200 to-yuzu-400', skill: 'Phản xạ' },
  { id: 'audio', path: '/arena/audio', title: 'Thử thách thính giác', jp: '聞き取り', desc: 'Nghe phát âm và chọn đúng mặt chữ giữa các phương án cùng nhóm âm.', icon: Ear, tone: 'from-sora-200 to-sora-400', skill: 'Nghe' },
  { id: 'whack', path: '/arena/whack', title: 'Đập chuột Kana', jp: 'もぐらたたき', desc: 'Nghe/nhìn romaji và đập đúng chú chuột cầm chữ – phân biệt các chữ dễ nhầm (シ/ツ, ソ/ン…).', icon: Hammer, tone: 'from-fuji-200 to-fuji-400', skill: 'Phân biệt' },
  { id: 'ninja', path: '/arena/ninja', title: 'Kana Ninja', jp: 'かなニンジャ', desc: 'Vuốt để chém bong bóng chữ theo luật thay đổi mỗi 20 giây. Tránh bom!', icon: Swords, tone: 'from-sakura-300 to-fuji-400', skill: 'Phân loại' },
  { id: 'tracing', path: '/arena/tracing', title: 'Tập viết nét', jp: '書き順', desc: 'Tô theo đúng thứ tự và chiều từng nét bút (Kakijun). Chấm điểm độ chuẩn xác.', icon: PenLine, tone: 'from-sumi-200 to-sumi-400', skill: 'Viết', anyPool: true },
  { id: 'builder', path: '/arena/word-builder', title: 'Xếp chữ thành từ', jp: '言葉づくり', desc: 'Sắp xếp các khối Kana xáo trộn thành từ vựng đúng theo nghĩa tiếng Việt.', icon: Puzzle, tone: 'from-matcha-200 to-matcha-400', skill: 'Từ vựng' },
]

export default function GameArena() {
  const { pool, isPlayable } = useActivePool()
  const bestScores = useProgressStore((s) => s.bestScores)

  return (
    <div>
      <PageHeader
        jp="ゲームアリーナ"
        title="Đấu trường Game"
        subtitle={`${GAMES.length} mini-game luyện phản xạ – dữ liệu lấy từ phạm vi học bạn đã chọn.`}
        actions={
          <Link to="/scope" className="btn-secondary">
            <SlidersHorizontal className="size-4" /> {pool.length} chữ trong phạm vi
          </Link>
        }
      />

      {!isPlayable && (
        <div className="mb-6">
          <PoolWarning count={pool.length} />
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {GAMES.map((g) => {
          const Icon = g.icon
          const disabled = !isPlayable && !g.anyPool
          return (
            <Link
              key={g.id}
              to={g.path}
              aria-disabled={disabled}
              className={cn('card group relative overflow-hidden p-5 transition hover:-translate-y-1 hover:shadow-lg', disabled && 'pointer-events-none opacity-50')}
            >
              <div className={cn('absolute -top-10 -right-10 size-40 rounded-full bg-gradient-to-br opacity-40 blur-2xl transition group-hover:opacity-70', g.tone)} />
              <div className="relative flex items-start gap-4">
                <div className={cn('grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-md', g.tone)}>
                  <Icon className="size-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-jp text-xs text-sumi-400">{g.jp}</div>
                  <h2 className="text-lg font-extrabold">{g.title}</h2>
                  <p className="mt-1 text-sm text-sumi-500 dark:text-sumi-400">{g.desc}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs font-semibold">
                    <span className="rounded-full bg-sumi-100 px-2.5 py-1 text-sumi-500 dark:bg-sumi-800">{g.skill}</span>
                    <span className="flex items-center gap-1 text-yuzu-500">
                      <Trophy className="size-3.5" /> Kỷ lục: {bestScores[g.id] ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
