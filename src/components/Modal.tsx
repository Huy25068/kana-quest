import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useBackToClose } from '../lib/navigation'

const noop = () => {}

export function Modal({ open, onClose, children }: { open: boolean; onClose?: () => void; children: ReactNode }) {
  // Nút Back của trình duyệt/điện thoại đóng popup thay vì rời trang.
  useBackToClose(open && !!onClose, onClose ?? noop)
  useEffect(() => {
    if (!open || !onClose) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-sumi-950/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="card relative max-h-[90dvh] w-full max-w-md animate-pop overflow-y-auto bg-white p-6 dark:bg-sumi-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {onClose && (
          <button onClick={onClose} className="absolute top-3 right-3 rounded-xl p-1.5 text-sumi-400 hover:bg-sumi-100 dark:hover:bg-sumi-800" aria-label="Đóng">
            <X className="size-5" />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
