import { useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate, useNavigationType, type NavigationType } from 'react-router-dom'

/**
 * Điều hướng "thông minh" kiểu app di động:
 *  - Nút ← = đi LÊN trang cha: nếu trang cha có trong lịch sử thì lùi về đúng mục đó
 *    (bỏ qua các bước trung gian), nếu không thì thay trang hiện tại bằng trang cha.
 *  - Lớp phủ (popup, ván chơi) có một mục lịch sử riêng → nút Back của trình duyệt/điện thoại đóng lớp phủ trước.
 *  - Chuyển giữa các mục menu chính không chồng lịch sử.
 *
 * React Router lưu chỉ số mục lịch sử ở `history.state.idx`; ta ghi lại đường dẫn của từng chỉ số
 * (sessionStorage – sống qua reload giống lịch sử trình duyệt).
 */

const STORE_KEY = 'kq-nav-entries'
const OVERLAY = '::overlay'

let entries: string[] = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(STORE_KEY) || '[]')
  } catch {
    return []
  }
})()

const currentIdx = (): number => window.history.state?.idx ?? 0

function record(idx: number, entry: string, type: NavigationType) {
  if (type === 'PUSH') entries = entries.slice(0, idx)
  entries[idx] = entry
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(entries))
  } catch {
    /* private mode */
  }
}

/** Gắn 1 lần trong layout để theo dõi lịch sử. */
export function useNavTracker() {
  const location = useLocation()
  const type = useNavigationType()
  useEffect(() => {
    const overlay = (location.state as { overlay?: string } | null)?.overlay
    record(currentIdx(), location.pathname + location.search + (overlay ? OVERLAY : ''), type)
  }, [location, type])
}

/** Đi lên trang cha `target` (vd '/arena'). */
export function useGoUp() {
  const navigate = useNavigate()
  return useCallback(
    (target: string) => {
      const idx = currentIdx()
      for (let j = idx - 1; j >= 0; j--) {
        if (entries[j] === target) return navigate(j - idx)
      }
      navigate(target, { replace: true })
    },
    [navigate],
  )
}

/**
 * Cho một lớp phủ (popup / ván chơi) một mục lịch sử riêng:
 * mở → thêm mục; Back → gọi onClose; đóng bằng nút trong UI → tự gỡ mục đó.
 */
export function useBackToClose(open: boolean, onClose: () => void) {
  const navigate = useNavigate()
  const location = useLocation()
  const keyRef = useRef<string | null>(null)
  const armed = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const ownsTopEntry = () => keyRef.current !== null && window.history.state?.usr?.overlay === keyRef.current
  const release = () => {
    if (ownsTopEntry()) navigate(-1)
    keyRef.current = null
    armed.current = false
  }

  // Mở lớp phủ → đẩy một mục lịch sử cùng URL, gắn khóa riêng.
  useEffect(() => {
    if (open && !keyRef.current) {
      const key = Math.random().toString(36).slice(2)
      keyRef.current = key
      armed.current = false
      navigate(
        { pathname: location.pathname, search: location.search, hash: location.hash },
        { state: { ...(location.state as object | null), overlay: key } },
      )
    } else if (!open && keyRef.current) {
      release() // đóng bằng UI
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Người dùng bấm Back → mục của ta bị bật ra → đóng lớp phủ.
  useEffect(() => {
    if (!keyRef.current) return
    const overlay = (location.state as { overlay?: string } | null)?.overlay
    if (overlay === keyRef.current) armed.current = true
    else if (armed.current) {
      keyRef.current = null
      armed.current = false
      onCloseRef.current()
    }
  }, [location])

  // Component bị gỡ khi lớp phủ còn mở (vd popup render có điều kiện) → dọn mục lịch sử.
  // Hoãn 1 nhịp: StrictMode gỡ-rồi-gắn-lại ngay lập tức, lúc đó không được dọn.
  const alive = useRef(false)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      setTimeout(() => {
        if (!alive.current && keyRef.current) release()
      }, 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/**
 * Điều hướng menu chính (sidebar / bottom nav):
 *  - Đang ở sâu trong mục đó (vd /arena/memory → Đấu trường) → đi lên.
 *  - Về Tổng quan → lùi về mục Tổng quan có sẵn nếu có.
 *  - Đổi giữa các mục ngang hàng → thay thế, không chồng lịch sử
 *    (Back từ mục bất kỳ → Tổng quan → thoát app, giống app di động).
 */
export function useTabNavigate(topPaths: string[]) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const goUp = useGoUp()
  return useCallback(
    (path: string) => {
      if (pathname === path) return
      if (path !== '/' && pathname.startsWith(path + '/')) return goUp(path)
      if (path === '/') return goUp('/')
      navigate(path, { replace: topPaths.includes(pathname) && pathname !== '/' })
    },
    [pathname, navigate, goUp, topPaths],
  )
}
