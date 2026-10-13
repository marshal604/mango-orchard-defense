import type { ReactNode } from 'react'

export function Dialog({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}
