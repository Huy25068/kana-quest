import type { StoreApi, UseBoundStore } from 'zustand'
import { supabase } from './supabase'
import { useProgressStore } from '../store/useProgressStore'
import { useScopeStore } from '../store/useScopeStore'
import { useNotesStore, type Note } from '../store/useNotesStore'
import { useReviewStore } from '../store/useReviewStore'
import type { CharStat } from '../types/kana'

/**
 * Đồng bộ các store persist (LocalStorage) với bảng `user_data` trên Supabase.
 *  - Lần đầu đăng nhập trên một thiết bị: GỘP dữ liệu máy + cloud (không mất tiến độ bên nào).
 *  - Các lần sau: bản sửa mới hơn thắng (last-write-wins theo từng store).
 */

type PersistedStore = UseBoundStore<StoreApi<object>> & { persist: { rehydrate: () => Promise<void> | void } }
interface Persisted {
  state: Record<string, unknown>
  version?: number
}
interface KeyMeta {
  dirtyAt: number // lần sửa cục bộ gần nhất
  syncedAt: number // thời điểm của bản đã khớp với cloud
}
interface Meta {
  userId: string | null
  keys: Record<string, KeyMeta>
}

const STORES: Record<string, PersistedStore> = {
  'kq-progress': useProgressStore as unknown as PersistedStore,
  'kq-scope': useScopeStore as unknown as PersistedStore,
  'kq-notes': useNotesStore as unknown as PersistedStore,
  'kq-review': useReviewStore as unknown as PersistedStore,
}
const META_KEY = 'kq-sync-meta'

/* ---------------- Meta & LocalStorage helpers ---------------- */

function readMeta(): Meta {
  try {
    return { userId: null, keys: {}, ...JSON.parse(localStorage.getItem(META_KEY) || '{}') }
  } catch {
    return { userId: null, keys: {} }
  }
}
const writeMeta = (m: Meta) => localStorage.setItem(META_KEY, JSON.stringify(m))

function readLocal(key: string): Persisted | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

let suppress = false
async function applyLocal(key: string, data: Persisted) {
  suppress = true
  try {
    localStorage.setItem(key, JSON.stringify(data))
    await STORES[key].persist.rehydrate()
  } finally {
    suppress = false
  }
}

/* ---------------- Gộp dữ liệu lần đầu ---------------- */

const maxRecord = (a: Record<string, number> = {}, b: Record<string, number> = {}) => {
  const out = { ...a }
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v)
  return out
}

function mergeProgress(local: Persisted['state'], cloud: Persisted['state']) {
  const ls = (local.stats ?? {}) as Record<string, CharStat>
  const cs = (cloud.stats ?? {}) as Record<string, CharStat>
  const stats: Record<string, CharStat> = { ...ls }
  for (const [id, c] of Object.entries(cs)) {
    const l = stats[id]
    // Giữ bản có nhiều lượt trả lời hơn (không cộng dồn để tránh nhân đôi khi gộp lại lần nữa).
    if (!l || c.correct + c.incorrect > l.correct + l.incorrect) stats[id] = c
  }
  const lDate = (local.lastActiveDate as string | null) ?? ''
  const cDate = (cloud.lastActiveDate as string | null) ?? ''
  const newer = cDate >= lDate ? cloud : local
  return {
    ...local,
    ...cloud,
    stats,
    exp: Math.max(Number(local.exp) || 0, Number(cloud.exp) || 0),
    gamesPlayed: Math.max(Number(local.gamesPlayed) || 0, Number(cloud.gamesPlayed) || 0),
    streak: newer.streak,
    lastActiveDate: newer.lastActiveDate,
    bestScores: maxRecord(local.bestScores as Record<string, number>, cloud.bestScores as Record<string, number>),
    activity: maxRecord(local.activity as Record<string, number>, cloud.activity as Record<string, number>),
  }
}

function mergeNotes(local: Persisted['state'], cloud: Persisted['state']) {
  const byId = new Map<string, Note>()
  for (const n of [...((local.notes ?? []) as Note[]), ...((cloud.notes ?? []) as Note[])]) {
    const prev = byId.get(n.id)
    if (!prev || n.updatedAt > prev.updatedAt) byId.set(n.id, n)
  }
  return { ...cloud, notes: [...byId.values()] }
}

function merge(key: string, local: Persisted, cloud: Persisted): Persisted {
  const version = cloud.version ?? local.version
  if (key === 'kq-progress') return { state: mergeProgress(local.state, cloud.state), version }
  if (key === 'kq-notes') return { state: mergeNotes(local.state, cloud.state), version }
  if (key === 'kq-review') return { state: { items: { ...(local.state.items as object), ...(cloud.state.items as object) } }, version }
  return cloud // phạm vi học: lấy theo cloud
}

/* ---------------- Push / Pull ---------------- */

export type SyncStatus = 'idle' | 'syncing' | 'error'
type Listener = (s: { status: SyncStatus; lastSyncedAt: number | null; error: string | null }) => void
let listener: Listener = () => {}
export const onSyncStatus = (l: Listener) => (listener = l)

let userId: string | null = null
let pushTimer: ReturnType<typeof setTimeout> | undefined
let running: Promise<void> | null = null

async function push() {
  if (!supabase || !userId) return
  const meta = readMeta()
  const rows = Object.keys(STORES)
    .filter((k) => (meta.keys[k]?.dirtyAt ?? 0) > (meta.keys[k]?.syncedAt ?? 0))
    .map((k) => ({ key: k, data: readLocal(k), at: meta.keys[k].dirtyAt }))
    .filter((r) => r.data)
  if (!rows.length) return
  const { error } = await supabase.from('user_data').upsert(
    rows.map((r) => ({ user_id: userId, key: r.key, data: r.data, updated_at: new Date(r.at).toISOString() })),
  )
  if (error) throw error
  const fresh = readMeta()
  for (const r of rows) fresh.keys[r.key] = { dirtyAt: fresh.keys[r.key]?.dirtyAt ?? r.at, syncedAt: r.at }
  writeMeta(fresh)
}

async function pullAndPush() {
  if (!supabase || !userId) return
  const { data, error } = await supabase.from('user_data').select('key, data, updated_at').eq('user_id', userId)
  if (error) throw error
  const meta = readMeta()
  const firstTime = meta.userId !== userId
  const cloud = new Map(data.map((r) => [r.key as string, { data: r.data as Persisted, at: Date.parse(r.updated_at) }]))
  const now = Date.now()

  for (const key of Object.keys(STORES)) {
    const local = readLocal(key)
    const row = cloud.get(key)
    const km = firstTime ? { dirtyAt: local ? now : 0, syncedAt: 0 } : (meta.keys[key] ?? { dirtyAt: local ? now : 0, syncedAt: 0 })

    if (!row) {
      if (local) km.dirtyAt = Math.max(km.dirtyAt, km.syncedAt + 1)
    } else if (firstTime && local) {
      await applyLocal(key, merge(key, local, row.data))
      km.dirtyAt = now
      km.syncedAt = 0
    } else if (!local || row.at > km.syncedAt) {
      const localDirty = km.dirtyAt > km.syncedAt
      if (!localDirty || row.at >= km.dirtyAt) {
        await applyLocal(key, row.data)
        km.dirtyAt = row.at
        km.syncedAt = row.at
      }
    }
    meta.keys[key] = km
  }
  meta.userId = userId
  writeMeta(meta)
  await push()
}

/** Đồng bộ ngay (gộp các lời gọi trùng nhau). */
export function syncNow() {
  if (!supabase || !userId) return Promise.resolve()
  if (running) return running
  listener({ status: 'syncing', lastSyncedAt: null, error: null })
  running = pullAndPush()
    .then(() => listener({ status: 'idle', lastSyncedAt: Date.now(), error: null }))
    .catch((e: Error) => listener({ status: 'error', lastSyncedAt: null, error: e.message }))
    .finally(() => (running = null))
  return running
}

function schedulePush() {
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    if (!userId) return
    listener({ status: 'syncing', lastSyncedAt: null, error: null })
    push()
      .then(() => listener({ status: 'idle', lastSyncedAt: Date.now(), error: null }))
      .catch((e: Error) => listener({ status: 'error', lastSyncedAt: null, error: e.message }))
  }, 1500)
}

/* ---------------- Khởi động ---------------- */

let started = false
export function startSync() {
  if (started || !supabase) return
  started = true

  // Mọi thay đổi cục bộ → đánh dấu "bẩn" và đẩy lên sau 1.5s.
  for (const [key, store] of Object.entries(STORES)) {
    store.subscribe(() => {
      if (suppress) return
      const meta = readMeta()
      meta.keys[key] = { syncedAt: meta.keys[key]?.syncedAt ?? 0, dirtyAt: Date.now() }
      writeMeta(meta)
      schedulePush()
    })
  }

  // Quay lại tab / có mạng lại → kéo bản mới nhất từ thiết bị khác.
  let lastPull = 0
  const pullSoon = () => {
    if (document.visibilityState !== 'visible' || Date.now() - lastPull < 10_000) return
    lastPull = Date.now()
    void syncNow()
  }
  document.addEventListener('visibilitychange', pullSoon)
  window.addEventListener('focus', pullSoon)
  window.addEventListener('online', pullSoon)
}

export function setSyncUser(id: string | null) {
  userId = id
  if (!id) {
    // Đăng xuất: giữ dữ liệu trên máy, lần đăng nhập sau sẽ gộp lại.
    writeMeta({ userId: null, keys: {} })
    return
  }
  void syncNow()
}
