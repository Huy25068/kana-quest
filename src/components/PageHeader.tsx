import type { ReactNode } from 'react'

export function PageHeader({ title, jp, subtitle, actions }: { title: string; jp?: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {jp && <div className="font-jp text-sm font-medium text-sakura-400">{jp}</div>}
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sumi-500 dark:text-sumi-400">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}
