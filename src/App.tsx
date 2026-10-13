import { useCallback, useState } from 'react'
import { Game, type GameEvent } from './game/logic/game'
import { BuildingMenu } from './ui/BuildingMenu'
import { Dialog } from './ui/Dialog'
import { GameView } from './ui/GameView'
import { Hud } from './ui/Hud'

export default function App() {
  const [game] = useState(() => new Game({ difficulty: 'normal', seed: Date.now() % 1e9 }))
  const [paused, setPaused] = useState(false)
  const [dead, setDead] = useState(false)

  const handleEvents = useCallback((events: GameEvent[]) => {
    if (events.some((e) => e.type === 'dead')) setDead(true)
  }, [])

  const revive = (mode: 'keep' | 'restart') => {
    game.revive(mode)
    setDead(false)
  }

  return (
    <main className="app">
      <GameView game={game} paused={paused} onEvents={handleEvents} />
      <Hud game={game} onPause={() => setPaused(true)} />
      <BuildingMenu game={game} />
      {paused && (
        <Dialog title="暫停">
          <button type="button" className="btn btn-gold" onClick={() => setPaused(false)}>繼續</button>
        </Dialog>
      )}
      {dead && (
        <Dialog title="你倒下了">
          <p>選擇復活方式</p>
          <button type="button" className="btn btn-gold" onClick={() => revive('keep')}>原地復活（保留背包與錢）</button>
          <button type="button" className="btn" onClick={() => revive('restart')}>回基地重來（背包與錢歸零）</button>
        </Dialog>
      )}
    </main>
  )
}
