import { useCallback, useState } from 'react'
import { Game, type GameEvent } from './game/logic/game'
import { BuildingMenu } from './ui/BuildingMenu'
import { Dialog } from './ui/Dialog'
import { GameView } from './ui/GameView'
import { Hud } from './ui/Hud'
import { Toasts, type Toast } from './ui/Toasts'

type Notice = Extract<GameEvent, { type: 'notice' }>

let toastId = 0

export default function App() {
  const [game] = useState(() => new Game({ difficulty: 'normal', seed: Date.now() % 1e9 }))
  const [paused, setPaused] = useState(false)
  const [dead, setDead] = useState(false)
  const [notices, setNotices] = useState<Notice[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])

  const handleEvents = useCallback((events: GameEvent[]) => {
    if (events.some((e) => e.type === 'dead')) setDead(true)
    const newNotices = events.filter((e): e is Notice => e.type === 'notice')
    if (newNotices.length) setNotices((n) => [...n, ...newNotices])
    const newToasts = events.flatMap((e) => (e.type === 'toast' ? [{ id: ++toastId, text: e.text }] : []))
    if (newToasts.length) setToasts((t) => [...t, ...newToasts].slice(-3))
  }, [])

  const expireToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const revive = (mode: 'keep' | 'restart') => {
    game.revive(mode)
    setDead(false)
  }

  const notice = notices[0]
  return (
    <main className="app">
      <GameView game={game} paused={paused || !!notice} onEvents={handleEvents} />
      <Hud game={game} onPause={() => setPaused(true)} />
      <BuildingMenu game={game} />
      <Toasts toasts={toasts} onExpire={expireToast} />
      {notice && (
        <Dialog title={notice.title} tone={notice.tone}>
          {notice.lines.map((l) => <p key={l}>{l}</p>)}
          <button type="button" className="btn btn-gold" onClick={() => setNotices((n) => n.slice(1))}>知道了</button>
        </Dialog>
      )}
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
