import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** null khi chưa cấu hình – app vẫn chạy offline bình thường. */
export const supabase = url && key ? createClient(url, key) : null
export const cloudEnabled = supabase !== null
