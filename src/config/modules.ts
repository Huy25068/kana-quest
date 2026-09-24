import {
  BookOpen, Gamepad2, Languages, LayoutDashboard, NotebookPen, Settings, SlidersHorizontal, StickyNote, Target, Landmark,
  type LucideIcon,
} from 'lucide-react'

export interface AppModule {
  id: string
  label: string
  path: string
  icon: LucideIcon
  status: 'active' | 'soon'
  description?: string
}

/**
 * Registry điều hướng: thêm module mới chỉ cần khai báo ở đây + thêm route trong App.tsx.
 * Module 'soon' hiển thị badge "Coming Soon" và mở trang giới thiệu.
 */
export const ACTIVE_MODULES: AppModule[] = [
  { id: 'dashboard', label: 'Tổng quan', path: '/', icon: LayoutDashboard, status: 'active' },
  { id: 'kana', label: 'Bảng Kana', path: '/kana', icon: Languages, status: 'active' },
  { id: 'scope', label: 'Phạm vi học', path: '/scope', icon: SlidersHorizontal, status: 'active' },
  { id: 'arena', label: 'Đấu trường', path: '/arena', icon: Gamepad2, status: 'active' },
  { id: 'notes', label: 'Ghi chú', path: '/notes', icon: StickyNote, status: 'active' },
]

export const FUTURE_MODULES: AppModule[] = [
  { id: 'kanji', label: 'Hán tự', path: '/kanji', icon: Landmark, status: 'soon', description: 'Kanji từ N5 đến N1 với bộ thủ, âm On/Kun và thứ tự nét.' },
  { id: 'vocab', label: 'Từ vựng', path: '/vocabulary', icon: BookOpen, status: 'soon', description: 'Từ vựng theo chủ đề kèm lặp lại ngắt quãng (SRS).' },
  { id: 'grammar', label: 'Ngữ pháp', path: '/grammar', icon: NotebookPen, status: 'soon', description: 'Mẫu ngữ pháp với ví dụ và bài tập điền trống.' },
  { id: 'jlpt', label: 'Luyện thi JLPT', path: '/jlpt', icon: Target, status: 'soon', description: 'Đề thi thử JLPT tính giờ, chấm điểm theo từng phần.' },
  { id: 'settings', label: 'Cài đặt', path: '/settings', icon: Settings, status: 'soon', description: 'Tuỳ chỉnh mục tiêu học, giọng đọc, sao lưu tiến độ.' },
]
