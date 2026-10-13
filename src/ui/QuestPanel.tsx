import { useEffect, useState } from 'react'
import type { Game } from '../game/logic/game'
import { nextGoal } from '../meta/quest'

export function QuestPanel({ game }: { game: Game }) {
  const [text, setText] = useState(() => nextGoal(game).text)
  useEffect(() => {
    const id = window.setInterval(() => setText(nextGoal(game).text), 500)
    return () => window.clearInterval(id)
  }, [game])
  return (
    <div className="quest" data-testid="quest">
      <div className="quest-title">任務</div>
      {text}
    </div>
  )
}
