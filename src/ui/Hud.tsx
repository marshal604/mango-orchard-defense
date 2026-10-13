import { useEffect, useState } from 'react'
import type { Game } from '../game/logic/game'

export const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const snapshot = (game: Game) => {
  const r = game.run
  const zone = game.map.zones.find((z) => z.id === game.zone)
  const king = game.monkeys.find((g) => g.size === 'king')
  return {
    time: formatTime(game.elapsed),
    money: r.money,
    mango: r.mango,
    banana: r.banana,
    bagUsed: r.bagUsed,
    bagCap: r.bagCap,
    hp: Math.ceil(r.hp),
    hpMax: r.hpMax,
    stars: zone?.stars ?? '',
    king: king ? `${Math.ceil(king.hp)}/${king.hpMax}` : null,
    kingRatio: king ? king.hp / king.hpMax : 0,
  }
}

export function Hud({ game, onPause }: { game: Game; onPause: () => void }) {
  const [s, setS] = useState(() => snapshot(game))
  useEffect(() => {
    const id = window.setInterval(() => setS(snapshot(game)), 100)
    return () => window.clearInterval(id)
  }, [game])
  const bagRatio = s.bagCap ? s.bagUsed / s.bagCap : 0
  return (
    <div className="hud">
      <div className="hud-row">
        <span className="hud-time" data-testid="timer">{s.time}</span>
        <button type="button" className="hud-btn" onClick={onPause} aria-label="暫停">II</button>
      </div>
      <div className="hud-row hud-res">
        <span data-testid="money"><img src="assets/icon_coin.png" alt="錢" />{s.money}</span>
        <span data-testid="mango"><img src="assets/icon_mango.png" alt="芒果" />{s.mango}</span>
        <span data-testid="banana"><img src="assets/icon_banana.png" alt="香蕉" />{s.banana}</span>
        <span><img src="assets/icon_heart.png" alt="血量" />{s.hp}/{s.hpMax}</span>
      </div>
      <div className="hud-bar-row">
        背包 {s.bagUsed}/{s.bagCap}
        <div className="hud-bar"><div style={{ width: `${bagRatio * 100}%`, background: bagRatio >= 0.85 ? '#d84c4c' : '#f8b800' }} /></div>
      </div>
      <div className="hud-bar-row">
        危險度 {s.stars}
        {s.king && (
          <>
            {'　'}猴王 {s.king}
            <div className="hud-bar"><div style={{ width: `${s.kingRatio * 100}%`, background: '#d84c4c' }} /></div>
          </>
        )}
      </div>
    </div>
  )
}
