import { useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { CircleCheck, Cloud, CloudOff, KeyRound, LogIn, LogOut, Mail, RefreshCw, UserRound } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { cloudEnabled } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import { cn } from '../lib/utils'

type Mode = 'signin' | 'signup' | 'forgot'

const inputCls =
  'w-full rounded-2xl border-2 border-sumi-200 bg-white py-3 pr-4 pl-11 outline-none focus:border-sakura-400 dark:border-sumi-700 dark:bg-sumi-800'

function Field({ icon: Icon, ...props }: { icon: typeof Mail } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-sumi-400" />
      <input {...props} className={inputCls} />
    </div>
  )
}

function useSubmit() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const msg = await fn()
      if (msg) setInfo(msg)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, info, run }
}

function Messages({ error, info }: { error: string | null; info: string | null }) {
  return (
    <>
      {error && <div className="rounded-2xl bg-sakura-50 p-3 text-sm text-sakura-600 dark:bg-sakura-500/10 dark:text-sakura-300">{error}</div>}
      {info && <div className="rounded-2xl bg-matcha-50 p-3 text-sm text-matcha-600 dark:bg-matcha-500/10 dark:text-matcha-300">{info}</div>}
    </>
  )
}

function AuthForm() {
  const { signIn, signUp, resetPassword } = useAuthStore()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { busy, error, info, run } = useSubmit()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    run(async () => {
      if (mode === 'signin') return signIn(email, password)
      if (mode === 'forgot') {
        await resetPassword(email)
        return 'Đã gửi email đặt lại mật khẩu. Mở link trong email để tạo mật khẩu mới.'
      }
      const r = await signUp(email, password)
      if (r === 'confirm-email') return 'Đăng ký thành công! Mở hộp thư và bấm link xác nhận, sau đó đăng nhập.'
    })
  }

  return (
    <div className="card mx-auto max-w-md p-6">
      {mode !== 'forgot' && (
        <div className="mb-5 grid grid-cols-2 rounded-2xl bg-sumi-100 p-1 dark:bg-sumi-800">
          {(['signin', 'signup'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn('rounded-xl py-2 text-sm font-semibold transition', mode === m ? 'bg-white text-sakura-600 shadow-sm dark:bg-sumi-700 dark:text-sakura-300' : 'text-sumi-500')}
            >
              {m === 'signin' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </button>
          ))}
        </div>
      )}
      {mode === 'forgot' && <h2 className="mb-4 text-lg font-bold">Quên mật khẩu</h2>}

      <form onSubmit={submit} className="space-y-3">
        <Field icon={Mail} type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {mode !== 'forgot' && (
          <Field
            icon={KeyRound}
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            placeholder={mode === 'signup' ? 'Mật khẩu (tối thiểu 6 ký tự)' : 'Mật khẩu'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
        <Messages error={error} info={info} />
        <button type="submit" disabled={busy} className="btn-primary w-full py-3">
          <LogIn className="size-4" />
          {busy ? 'Đang xử lý…' : mode === 'signin' ? 'Đăng nhập' : mode === 'signup' ? 'Tạo tài khoản' : 'Gửi email đặt lại'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm">
        {mode === 'forgot' ? (
          <button onClick={() => setMode('signin')} className="font-semibold text-sakura-500 hover:underline">← Quay lại đăng nhập</button>
        ) : (
          <button onClick={() => setMode('forgot')} className="text-sumi-400 hover:text-sakura-500 hover:underline">Quên mật khẩu?</button>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-sumi-400">
        Tiến độ đang có trên máy này sẽ được gộp vào tài khoản ở lần đăng nhập đầu tiên – không bị mất.
      </p>
    </div>
  )
}

function NewPasswordForm() {
  const updatePassword = useAuthStore((s) => s.updatePassword)
  const [password, setPassword] = useState('')
  const { busy, error, info, run } = useSubmit()
  return (
    <form
      className="card mx-auto max-w-md space-y-3 p-6"
      onSubmit={(e) => {
        e.preventDefault()
        run(async () => {
          await updatePassword(password)
          return 'Đã đổi mật khẩu thành công!'
        })
      }}
    >
      <h2 className="text-lg font-bold">Đặt mật khẩu mới</h2>
      <Field icon={KeyRound} type="password" required minLength={6} autoComplete="new-password" placeholder="Mật khẩu mới" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Messages error={error} info={info} />
      <button type="submit" disabled={busy} className="btn-primary w-full py-3">Lưu mật khẩu</button>
    </form>
  )
}

function Profile() {
  const { user, syncStatus, lastSyncedAt, syncError, syncNow, signOut } = useAuthStore()
  return (
    <div className="card mx-auto max-w-md p-6">
      <div className="flex items-center gap-4">
        <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-sakura-300 to-sakura-500 text-white">
          <UserRound className="size-7" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-sumi-400">Đã đăng nhập</div>
          <div className="truncate text-lg font-bold">{user!.email}</div>
        </div>
      </div>

      <div
        className={cn(
          'mt-5 flex items-center gap-3 rounded-2xl p-4 text-sm',
          syncStatus === 'error' ? 'bg-sakura-50 dark:bg-sakura-500/10' : 'bg-matcha-50 dark:bg-matcha-500/10',
        )}
      >
        {syncStatus === 'syncing' ? (
          <RefreshCw className="size-5 shrink-0 animate-spin text-sora-500" />
        ) : syncStatus === 'error' ? (
          <CloudOff className="size-5 shrink-0 text-sakura-500" />
        ) : (
          <CircleCheck className="size-5 shrink-0 text-matcha-500" />
        )}
        <div>
          <div className="font-bold">
            {syncStatus === 'syncing' ? 'Đang đồng bộ…' : syncStatus === 'error' ? 'Đồng bộ thất bại' : 'Đã đồng bộ'}
          </div>
          <div className="text-sumi-500 dark:text-sumi-400">
            {syncStatus === 'error'
              ? syncError
              : lastSyncedAt
                ? `Lần cuối: ${new Date(lastSyncedAt).toLocaleTimeString('vi-VN')}`
                : 'Tiến độ, phạm vi học và ghi chú được lưu trên cloud.'}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-sumi-500 dark:text-sumi-400">
        Đăng nhập cùng tài khoản trên điện thoại và máy tính để dùng chung dữ liệu. App tự đồng bộ khi bạn học và khi mở lại app.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button className="btn-secondary" onClick={() => syncNow()} disabled={syncStatus === 'syncing'}>
          <RefreshCw className="size-4" /> Đồng bộ ngay
        </button>
        <button className="btn-secondary text-sakura-500" onClick={() => signOut()}>
          <LogOut className="size-4" /> Đăng xuất
        </button>
      </div>
    </div>
  )
}

export default function Account() {
  const { user, ready, recovering } = useAuthStore()
  return (
    <div>
      <PageHeader jp="アカウント" title="Tài khoản & Đồng bộ" subtitle="Dùng chung tiến độ học giữa điện thoại và máy tính." />
      {!cloudEnabled ? (
        <div className="card mx-auto max-w-md p-6 text-center">
          <Cloud className="mx-auto size-12 text-sumi-300" />
          <p className="mt-3 text-sumi-500">
            Tính năng đồng bộ chưa được cấu hình. Thêm <code className="rounded bg-sumi-100 px-1 dark:bg-sumi-800">VITE_SUPABASE_URL</code> và{' '}
            <code className="rounded bg-sumi-100 px-1 dark:bg-sumi-800">VITE_SUPABASE_ANON_KEY</code> để bật.
          </p>
        </div>
      ) : !ready ? (
        <div className="grid h-40 place-items-center text-sumi-400">Đang tải…</div>
      ) : recovering ? (
        <NewPasswordForm />
      ) : user ? (
        <Profile />
      ) : (
        <AuthForm />
      )}
    </div>
  )
}
