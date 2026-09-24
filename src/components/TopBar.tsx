import { Flame, Moon, Star, Sun, Volume2, VolumeX } from 'lucide-react'
import { currentStreak, levelInfo, useProgressStore } from '../store/useProgressStore'
import { cn } from '../lib/utils'

export function TopBar() {
  const { exp, streak, lastActiveDate, sfxEnabled, theme, toggleSfx, toggleTheme } = useProgressStore()
  const lv = levelInfo(exp)
  const days = currentStreak(streak, lastActiveDate)

  return (
    <header className="sticky top-0 z-20 border-b border-sumi-200/70 bg-white/75 backdrop-blur dark:border-sumi-800 dark:bg-sumi-950/75">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:gap-4 sm:px-6">
        <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-sakura-300 to-sakura-500 font-jp text-lg font-bold text-white lg:hidden">
          あ
        </div>

        {/* Streak */}
        <div
          title={`Chuỗi ${days} ngày học liên tục`}
          className={cn(
            'flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm font-bold',
            days > 0 ? 'bg-yuzu-100 text-yuzu-500 dark:bg-yuzu-500/15' : 'bg-sumi-100 text-sumi-400 dark:bg-sumi-800',
          )}
        >
          <Flame className={cn('size-4', days > 0 && 'fill-current')} />
          {days}
        </div>

        {/* Level & EXP */}
        <div className="flex min-w-0 flex-1 items-center gap-2" title={`${lv.current}/${lv.needed} EXP`}>
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-fuji-100 px-2.5 py-1.5 text-sm font-bold text-fuji-500 dark:bg-fuji-500/15 dark:text-fuji-300">
            <Star className="size-4 fill-current" />
            Lv {lv.level}
          </div>
          <div className="hidden min-w-0 flex-1 sm:block">
            <div className="h-2.5 overflow-hidden rounded-full bg-sumi-100 dark:bg-sumi-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-fuji-300 to-fuji-500 transition-all duration-500"
                style={{ width: `${(lv.current / lv.needed) * 100}%` }}
              />
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-sumi-400">
              {lv.current}/{lv.needed} EXP
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={toggleSfx}
            className="grid size-9 place-items-center rounded-xl text-sumi-500 hover:bg-sumi-100 dark:hover:bg-sumi-800"
            aria-label={sfxEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            title={sfxEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {sfxEnabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </button>
          <button
            onClick={toggleTheme}
            className="grid size-9 place-items-center rounded-xl text-sumi-500 hover:bg-sumi-100 dark:hover:bg-sumi-800"
            aria-label="Đổi giao diện sáng/tối"
            title="Đổi giao diện sáng/tối"
          >
            {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
        </div>
      </div>
    </header>
  )
}
