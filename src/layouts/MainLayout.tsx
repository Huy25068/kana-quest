import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, type LinkProps } from 'react-router-dom'
import { ACTIVE_MODULES, FUTURE_MODULES, type AppModule } from '../config/modules'
import { useProgressStore } from '../store/useProgressStore'
import { TopBar } from '../components/TopBar'
import { cn } from '../lib/utils'
import { useNavTracker, useTabNavigate } from '../lib/navigation'

const TOP_PATHS = [...ACTIVE_MODULES, ...FUTURE_MODULES].map((m) => m.path).concat('/account')

/** Click thường → điều hướng kiểu tab; Ctrl/Cmd/chuột giữa → giữ hành vi mở tab mới của trình duyệt. */
function useTabClick() {
  const go = useTabNavigate(TOP_PATHS)
  return (path: string): LinkProps['onClick'] =>
    (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      e.preventDefault()
      go(path)
    }
}

function SideLink({ m }: { m: AppModule }) {
  const tabClick = useTabClick()
  const Icon = m.icon
  const soon = m.status === 'soon'
  return (
    <NavLink
      to={m.path}
      end={m.path === '/'}
      onClick={tabClick(m.path)}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition',
          isActive && !soon
            ? 'bg-sakura-100 text-sakura-600 dark:bg-sakura-500/15 dark:text-sakura-300'
            : 'text-sumi-600 hover:bg-sumi-100 dark:text-sumi-300 dark:hover:bg-sumi-800',
          soon && 'opacity-60',
          isActive && soon && 'bg-sumi-100 dark:bg-sumi-800',
        )
      }
    >
      <Icon className="size-5 shrink-0" />
      <span className="flex-1">{m.label}</span>
      {soon && (
        <span className="rounded-full bg-sumi-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sumi-500 dark:bg-sumi-700 dark:text-sumi-300">
          Soon
        </span>
      )}
    </NavLink>
  )
}

export default function MainLayout() {
  const theme = useProgressStore((s) => s.theme)
  const { pathname } = useLocation()
  const tabClick = useTabClick()
  useNavTracker()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar – desktop */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-sumi-200/70 bg-white/60 p-4 backdrop-blur lg:flex dark:border-sumi-800 dark:bg-sumi-900/50">
        <div className="mb-6 flex items-center gap-3 px-2">
          <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-sakura-300 to-sakura-500 font-jp text-2xl font-bold text-white shadow-md">
            あ
          </div>
          <div>
            <div className="text-lg font-extrabold leading-tight">Kana Quest</div>
            <div className="font-jp text-xs text-sumi-400">かなクエスト</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {ACTIVE_MODULES.map((m) => (
            <SideLink key={m.id} m={m} />
          ))}
        </nav>
        <div className="mt-6 mb-2 px-3 text-xs font-bold uppercase tracking-wider text-sumi-400">Sắp ra mắt</div>
        <nav className="flex flex-col gap-1">
          {FUTURE_MODULES.map((m) => (
            <SideLink key={m.id} m={m} />
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-gradient-to-br from-matcha-100 to-sora-100 p-4 text-xs text-sumi-600 dark:from-matcha-500/10 dark:to-sora-500/10 dark:text-sumi-300">
          <div className="font-jp text-base font-bold text-sumi-700 dark:text-sumi-100">七転び八起き</div>
          Ngã bảy lần, đứng dậy tám lần.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-28 sm:px-6 lg:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav – mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-sumi-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden dark:border-sumi-800 dark:bg-sumi-900/90">
        {ACTIVE_MODULES.map((m) => {
          const Icon = m.icon
          return (
            <NavLink
              key={m.id}
              to={m.path}
              end={m.path === '/'}
              onClick={tabClick(m.path)}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold',
                  isActive ? 'text-sakura-500' : 'text-sumi-400',
                )
              }
            >
              <Icon className="size-5" />
              {m.label}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
