import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, Pin, PinOff, Plus, Search, StickyNote, Trash } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { NOTE_COLORS, useNotesStore, type Note, type NoteColor } from '../store/useNotesStore'
import { cn } from '../lib/utils'
import { useGoUp } from '../lib/navigation'

// Chuỗi class tĩnh để Tailwind quét được.
const COLOR: Record<NoteColor, { card: string; dot: string }> = {
  sakura: { card: 'border-sakura-200 bg-sakura-50 dark:border-sakura-500/30 dark:bg-sakura-500/10', dot: 'bg-sakura-300' },
  matcha: { card: 'border-matcha-200 bg-matcha-50 dark:border-matcha-500/30 dark:bg-matcha-500/10', dot: 'bg-matcha-300' },
  sora: { card: 'border-sora-200 bg-sora-50 dark:border-sora-500/30 dark:bg-sora-500/10', dot: 'bg-sora-300' },
  yuzu: { card: 'border-yuzu-200 bg-yuzu-50 dark:border-yuzu-500/30 dark:bg-yuzu-500/10', dot: 'bg-yuzu-300' },
  fuji: { card: 'border-fuji-200 bg-fuji-50 dark:border-fuji-500/30 dark:bg-fuji-500/10', dot: 'bg-fuji-300' },
  sumi: { card: 'border-sumi-200 bg-white dark:border-sumi-700 dark:bg-sumi-800', dot: 'bg-sumi-300' },
}

const fmtDate = (t: number) =>
  new Date(t).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function Editor({ note, onBack }: { note: Note; onBack: () => void }) {
  const { updateNote, togglePin, removeNote } = useNotesStore()
  return (
    <div className={cn('flex min-h-[60dvh] flex-col rounded-3xl border-2 p-4 shadow-sm sm:p-5', COLOR[note.color].card)}>
      <div className="mb-3 flex items-center gap-2">
        <button onClick={onBack} className="grid size-9 place-items-center rounded-xl hover:bg-black/5 lg:hidden dark:hover:bg-white/10" aria-label="Quay lại danh sách">
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex flex-1 gap-1.5">
          {NOTE_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => updateNote(note.id, { color: c })}
              className={cn('size-6 rounded-full border-2', COLOR[c].dot, note.color === c ? 'border-sumi-600 dark:border-white' : 'border-transparent')}
              aria-label={`Màu ${c}`}
            />
          ))}
        </div>
        <button onClick={() => togglePin(note.id)} className="grid size-9 place-items-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10" title={note.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}>
          {note.pinned ? <PinOff className="size-5" /> : <Pin className="size-5" />}
        </button>
        <button
          onClick={() => {
            if (confirm('Xóa ghi chú này?')) {
              removeNote(note.id)
              onBack()
            }
          }}
          className="grid size-9 place-items-center rounded-xl text-sakura-500 hover:bg-sakura-100 dark:hover:bg-sakura-500/20"
          title="Xóa ghi chú"
        >
          <Trash className="size-5" />
        </button>
      </div>
      <input
        value={note.title}
        onChange={(e) => updateNote(note.id, { title: e.target.value })}
        placeholder="Tiêu đề…"
        className="w-full bg-transparent text-2xl font-extrabold outline-none placeholder:text-sumi-300"
      />
      <div className="mt-1 text-xs text-sumi-400">Sửa lần cuối: {fmtDate(note.updatedAt)} · tự động lưu</div>
      <textarea
        value={note.content}
        onChange={(e) => updateNote(note.id, { content: e.target.value })}
        placeholder="Ghi lại mẹo nhớ, từ vựng mới, chữ hay nhầm (vd: シ ≠ ツ, ソ ≠ ン)…"
        className="mt-4 w-full flex-1 resize-none bg-transparent font-jp text-base leading-relaxed outline-none placeholder:font-sans placeholder:text-sumi-300"
        autoFocus={!note.content}
      />
    </div>
  )
}

export default function Notes() {
  const notes = useNotesStore((s) => s.notes)
  const addNote = useNotesStore((s) => s.addNote)
  const removeNote = useNotesStore((s) => s.removeNote)
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const selectedId = params.get('id')
  const selected = notes.find((n) => n.id === selectedId)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notes
      .filter((n) => !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
  }, [notes, query])

  const goUp = useGoUp()

  // Danh sách → ghi chú: thêm 1 bước lịch sử; ghi chú → ghi chú khác: thay thế (Back luôn về danh sách).
  const open = (id: string) => setParams({ id }, { replace: !!selectedId })
  const close = () => goUp('/notes')
  const create = () => open(addNote())

  // Rời một ghi chú còn trống (bằng bất kỳ cách nào, kể cả nút Back) → bỏ luôn, tránh rác.
  const prevId = useRef(selectedId)
  useEffect(() => {
    const dropIfEmpty = (id: string | null) => {
      const n = id && useNotesStore.getState().notes.find((x) => x.id === id)
      if (n && !n.title.trim() && !n.content.trim()) removeNote(n.id)
    }
    if (prevId.current !== selectedId) dropIfEmpty(prevId.current)
    prevId.current = selectedId
  }, [selectedId, removeNote])
  useEffect(
    () => () => {
      const id = prevId.current
      const n = id && useNotesStore.getState().notes.find((x) => x.id === id)
      if (n && !n.title.trim() && !n.content.trim()) useNotesStore.getState().removeNote(n.id)
    },
    [],
  )

  return (
    <div>
      <PageHeader
        jp="ノート"
        title="Ghi chú"
        subtitle="Sổ tay cá nhân – lưu mẹo nhớ, từ vựng và những chữ hay nhầm."
        actions={
          <button className="btn-primary" onClick={create}>
            <Plus className="size-4" /> Ghi chú mới
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Danh sách – ẩn trên mobile khi đang mở một ghi chú */}
        <div className={cn('space-y-3', selected && 'hidden lg:block')}>
          <div className="relative">
            <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-sumi-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm ghi chú…"
              className="w-full rounded-2xl border border-sumi-200 bg-white py-2.5 pr-3 pl-10 outline-none focus:border-sakura-400 dark:border-sumi-700 dark:bg-sumi-800"
            />
          </div>
          {list.length === 0 && (
            <div className="card p-6 text-center text-sm text-sumi-400">
              {notes.length ? 'Không tìm thấy ghi chú phù hợp.' : 'Chưa có ghi chú nào.'}
            </div>
          )}
          {list.map((n) => (
            <button
              key={n.id}
              onClick={() => open(n.id)}
              className={cn(
                'block w-full rounded-2xl border-2 p-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-md',
                COLOR[n.color].card,
                n.id === selectedId && 'ring-2 ring-sakura-400',
              )}
            >
              <div className="flex items-center gap-1.5">
                {n.pinned && <Pin className="size-3.5 shrink-0 text-sakura-500" />}
                <span className="truncate font-bold">{n.title || 'Không có tiêu đề'}</span>
              </div>
              <p className="mt-1 line-clamp-2 font-jp text-sm text-sumi-500 dark:text-sumi-400">{n.content || '…'}</p>
              <div className="mt-2 text-[11px] text-sumi-400">{fmtDate(n.updatedAt)}</div>
            </button>
          ))}
        </div>

        {/* Soạn thảo */}
        <div className={cn(!selected && 'hidden lg:block')}>
          {selected ? (
            <Editor key={selected.id} note={selected} onBack={close} />
          ) : (
            <div className="card grid min-h-[60dvh] place-items-center p-8 text-center">
              <div>
                <StickyNote className="mx-auto size-14 text-sakura-300" />
                <p className="mt-3 text-sumi-500">Chọn một ghi chú bên trái hoặc tạo ghi chú mới.</p>
                <button className="btn-secondary mt-4" onClick={create}>
                  <Plus className="size-4" /> Ghi chú mới
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
