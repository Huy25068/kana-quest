import { Link } from 'react-router-dom'
import { Hammer } from 'lucide-react'
import type { AppModule } from '../config/modules'

export default function ComingSoon({ module: m }: { module: AppModule }) {
  const Icon = m.icon
  return (
    <div className="card mx-auto mt-6 max-w-lg p-10 text-center">
      <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-sumi-100 text-sumi-400 dark:bg-sumi-800">
        <Icon className="size-10" />
      </div>
      <span className="mt-5 inline-flex items-center gap-1 rounded-full bg-yuzu-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-yuzu-500 dark:bg-yuzu-500/15">
        <Hammer className="size-3.5" /> Coming soon
      </span>
      <h1 className="mt-3 text-2xl font-extrabold">{m.label}</h1>
      <p className="mt-2 text-sumi-500 dark:text-sumi-400">{m.description}</p>
      <p className="mt-4 text-sm text-sumi-400">Hãy làm chủ Hiragana & Katakana trước nhé – nền móng cho mọi thứ phía sau!</p>
      <Link to="/arena" className="btn-primary mt-6">Luyện Kana ngay</Link>
    </div>
  )
}
