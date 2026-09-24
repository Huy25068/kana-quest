import { Lightbulb, Volume2 } from 'lucide-react'
import { Modal } from './Modal'
import type { KanaItem } from '../types/kana'
import { CATEGORY_LABELS, KANA_BY_ID } from '../data/kana'
import { accuracy, useProgressStore } from '../store/useProgressStore'
import { speak } from '../lib/audio'

export function counterpartOf(k: KanaItem) {
  return KANA_BY_ID.get(k.type === 'hiragana' ? k.id.replace('hira_', 'kata_') : k.id.replace('kata_', 'hira_'))
}

export function KanaDetail({ kana, onClose }: { kana: KanaItem | null; onClose: () => void }) {
  const stat = useProgressStore((s) => (kana ? s.stats[kana.id] : undefined))
  if (!kana) return null
  const acc = accuracy(stat)
  const other = counterpartOf(kana)
  const cat = CATEGORY_LABELS[kana.category]

  return (
    <Modal open onClose={onClose}>
      <div className="text-center">
        <div className="flex justify-center gap-2 text-xs font-semibold">
          <span className="rounded-full bg-sakura-100 px-2.5 py-1 text-sakura-600 dark:bg-sakura-500/15 dark:text-sakura-300">
            {kana.type === 'hiragana' ? 'Hiragana' : 'Katakana'}
          </span>
          <span className="rounded-full bg-sumi-100 px-2.5 py-1 text-sumi-500 dark:bg-sumi-800">
            {cat.vi} {cat.jp}
          </span>
        </div>
        <button
          onClick={() => speak(kana.char, { audioUrl: kana.audioUrl })}
          className="mx-auto mt-4 block rounded-3xl px-6 font-jp text-8xl font-bold leading-tight transition hover:bg-sumi-50 dark:hover:bg-sumi-800"
          title="Nghe phát âm"
        >
          {kana.char}
        </button>
        <div className="text-2xl font-extrabold text-sakura-500">{kana.romaji}</div>
        <button onClick={() => speak(kana.char, { audioUrl: kana.audioUrl })} className="btn-secondary mt-3">
          <Volume2 className="size-4" /> Nghe phát âm
        </button>
      </div>

      <div className="mt-5 space-y-3 text-sm">
        <div className="flex gap-3 rounded-2xl bg-yuzu-50 p-4 dark:bg-yuzu-500/10">
          <Lightbulb className="size-5 shrink-0 text-yuzu-500" />
          <div>
            <div className="font-bold">Mẹo ghi nhớ</div>
            <div className="text-sumi-600 dark:text-sumi-300">{kana.mnemonicHint}</div>
          </div>
        </div>

        {kana.exampleWord && (
          <button
            onClick={() => speak(kana.exampleWord!.kana)}
            className="flex w-full items-center gap-3 rounded-2xl bg-sora-50 p-4 text-left transition hover:bg-sora-100 dark:bg-sora-500/10 dark:hover:bg-sora-500/20"
          >
            <Volume2 className="size-5 shrink-0 text-sora-500" />
            <div>
              <div className="font-bold">Từ ví dụ</div>
              <div>
                <span className="font-jp text-lg font-bold">{kana.exampleWord.kana}</span>
                {kana.exampleWord.kanji && <span className="ml-1 font-jp text-sumi-400">({kana.exampleWord.kanji})</span>}
                <span className="text-sumi-500"> · {kana.exampleWord.romaji} – </span>
                <span className="font-semibold">{kana.exampleWord.meaningVi}</span>
              </div>
            </div>
          </button>
        )}

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-sumi-50 p-3 dark:bg-sumi-800">
            <div className="text-xs text-sumi-400">{other?.type === 'katakana' ? 'Katakana' : 'Hiragana'}</div>
            <div className="font-jp text-2xl font-bold">{other?.char}</div>
          </div>
          <div className="rounded-2xl bg-sumi-50 p-3 dark:bg-sumi-800">
            <div className="text-xs text-sumi-400">Đúng / Sai</div>
            <div className="text-lg font-bold tabular-nums">
              <span className="text-matcha-500">{stat?.correct ?? 0}</span> / <span className="text-sakura-500">{stat?.incorrect ?? 0}</span>
            </div>
          </div>
          <div className="rounded-2xl bg-sumi-50 p-3 dark:bg-sumi-800">
            <div className="text-xs text-sumi-400">Chính xác</div>
            <div className="text-lg font-bold">{acc === null ? '–' : `${Math.round(acc * 100)}%`}</div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
