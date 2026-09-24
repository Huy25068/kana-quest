import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { onSyncStatus, setSyncUser, startSync, syncNow, type SyncStatus } from '../lib/sync'

interface AuthState {
  user: User | null
  ready: boolean
  recovering: boolean // đang đặt lại mật khẩu từ link email
  syncStatus: SyncStatus
  lastSyncedAt: number | null
  syncError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<'signed-in' | 'confirm-email'>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
  syncNow: () => Promise<void>
}

const MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, 'Sai email hoặc mật khẩu.'],
  [/email not confirmed/i, 'Email chưa được xác nhận – hãy mở hộp thư và bấm link xác nhận.'],
  [/already registered/i, 'Email này đã có tài khoản – hãy đăng nhập.'],
  [/at least 6 characters/i, 'Mật khẩu cần tối thiểu 6 ký tự.'],
  [/rate limit|too many/i, 'Thao tác quá nhanh, vui lòng thử lại sau ít phút.'],
  [/invalid.*email|email.*invalid/i, 'Email không hợp lệ.'],
  [/failed to fetch|network/i, 'Không kết nối được máy chủ. Kiểm tra mạng.'],
]
const vi = (e: { message: string }) => new Error(MESSAGES.find(([re]) => re.test(e.message))?.[1] ?? e.message)

function requireClient() {
  if (!supabase) throw new Error('Chưa cấu hình Supabase.')
  return supabase
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  ready: !supabase,
  recovering: false,
  syncStatus: 'idle',
  lastSyncedAt: null,
  syncError: null,

  signIn: async (email, password) => {
    const { error } = await requireClient().auth.signInWithPassword({ email, password })
    if (error) throw vi(error)
  },
  signUp: async (email, password) => {
    const { data, error } = await requireClient().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/account` },
    })
    if (error) throw vi(error)
    return data.session ? 'signed-in' : 'confirm-email'
  },
  resetPassword: async (email) => {
    const { error } = await requireClient().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/account` })
    if (error) throw vi(error)
  },
  updatePassword: async (password) => {
    const { error } = await requireClient().auth.updateUser({ password })
    if (error) throw vi(error)
    set({ recovering: false })
  },
  signOut: async () => {
    await requireClient().auth.signOut()
  },
  syncNow: () => syncNow(),
}))

/** Gọi 1 lần khi app khởi động. */
export function initAuth() {
  if (!supabase) return
  startSync()
  onSyncStatus(({ status, lastSyncedAt, error }) =>
    useAuthStore.setState((s) => ({ syncStatus: status, syncError: error, lastSyncedAt: lastSyncedAt ?? s.lastSyncedAt })),
  )
  let currentId: string | null = null
  supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user ?? null
    useAuthStore.setState({ user, ready: true, ...(event === 'PASSWORD_RECOVERY' ? { recovering: true } : {}) })
    if ((user?.id ?? null) !== currentId) {
      currentId = user?.id ?? null
      // Không gọi Supabase trực tiếp trong callback (tránh deadlock của supabase-js).
      setTimeout(() => setSyncUser(currentId), 0)
    }
  })
}
