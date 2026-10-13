import { useState } from 'react'
import { Game } from './game/logic/game'
import { GameView } from './ui/GameView'

export default function App() {
  const [game] = useState(() => new Game({ difficulty: 'normal', seed: Date.now() % 1e9 }))
  return (
    <main className="app">
      <GameView game={game} paused={false} />
    </main>
  )
}
