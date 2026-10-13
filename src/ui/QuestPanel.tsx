import { forwardRef } from 'react'
import type { GuidePanel } from '../meta/guide'

interface Props { panel: GuidePanel; justCompleted: boolean }

// Re-keyed on every step so it re-pops (docs/ui-reference.md 2.3).
export const QuestPanel = forwardRef<HTMLDivElement, Props>(function QuestPanel({ panel, justCompleted }, ref) {
  const tone = panel.reminder ? 'var(--g-warn)' : 'var(--g-gold)'
  return (
    <div ref={ref} key={`${panel.step}-${panel.reminder ? 'r' : ''}`} className="quest pop" style={{ borderColor: tone }} data-testid="quest">
      <div className="quest-head">
        <span style={{ color: panel.reminder ? 'var(--g-warn)' : undefined }}>
          {panel.reminder ? '提醒' : justCompleted ? '任務完成！' : `任務 ${panel.step}/${panel.total}`}
        </span>
        <span className="gold">跟著箭頭 ➜</span>
      </div>
      <div className="quest-title" style={{ color: panel.reminder ? 'var(--g-warn)' : undefined }}>{panel.title}</div>
      {panel.detail && <div className="quest-detail">{panel.detail}</div>}
      {panel.warn && <div className="quest-detail warn">{panel.warn}</div>}
      {panel.tip && <div className="quest-detail gold">{panel.tip}</div>}
    </div>
  )
})
