import { useEffect } from 'react'

export interface Toast { id: number; text: string }

function ToastItem({ toast, onExpire }: { toast: Toast; onExpire: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onExpire(toast.id), 2200)
    return () => window.clearTimeout(timer)
  }, [toast.id, onExpire])
  return <div className="toast">{toast.text}</div>
}

export function Toasts({ toasts, onExpire }: { toasts: Toast[]; onExpire: (id: number) => void }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => <ToastItem key={t.id} toast={t} onExpire={onExpire} />)}
    </div>
  )
}
