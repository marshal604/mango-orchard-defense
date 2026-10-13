import type { ReactNode } from 'react'

export function Dialog({ title, tone, children }: { title: string; tone?: 'info' | 'warn'; children: ReactNode }) {
  return (
    <div className="dialog-backdrop">
      <div className={tone === 'warn' ? 'dialog dialog-warn' : 'dialog'} role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}
