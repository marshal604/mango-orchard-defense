import { forwardRef, useEffect, useState } from 'react'
import { ECONOMY } from '../game/logic/config'
import type { Game } from '../game/logic/game'
import { isMuted, setMuted } from '../game/sfx'
import { formatTime } from './format'

interface Badge { text: string; color: string }

function badges(game: Game): Badge[] {
  const s = game.status
  const out: Badge[] = []
  const sec = (v: number) => Math.ceil(v)
  if (s.scratchLeft > 0) out.push({ text: `抓傷流血 ${sec(s.scratchLeft)}`, color: '#ff8a7a' })
  if (s.sprainLeft > 0) out.push({ text: `扭到腳 ${sec(s.sprainLeft)}`, color: '#8fb8ff' })
  if (s.hasteLeft > 0) out.push({ text: `手腳俐落 攻速x2 ${sec(s.hasteLeft)}`, color: '#f8b800' })
  if (s.bellyacheLeft > 0) out.push({ text: `肚子痛 ${sec(s.bellyacheLeft)}`, color: '#c8ff9a' })
  if (s.chiliLeft > 0) out.push({ text: `辣椒手 ${sec(s.chiliLeft)}`, color: '#ff8a3d' })
  if (game.hazards.inPavilion) out.push({ text: '涼亭下：回血', color: '#8fe3ff' })
  if (game.run.perks.discount) out.push({ text: '升級8折', color: '#f8b800' })
  if (game.run.perks.overwork) out.push({ text: '工人過勞', color: '#ff6a4a' })
  return out
}

const snapshot = (game: Game) => {
  const r = game.run
  const zone = game.map.zones.find((z) => z.id === game.zone)
  return {
    time: formatTime(game.elapsed),
    money: r.money, mango: r.mango, banana: r.banana,
    bagUsed: r.bagUsed, bagCap: r.bagCap,
    stars: zone?.stars ?? '',
    king: `${Math.ceil(game.king.hp)}/${game.king.hpMax}`,
    kingRatio: game.king.hp / game.king.hpMax,
    badges: badges(game),
  }
}

interface Props { game: Game; onPause: () => void }

// Top bar from docs/ui-reference.md 2.3. Polls the game every 100 ms like the original's emitHud.
export const Hud = forwardRef<HTMLDivElement, Props>(function Hud({ game, onPause }, ref) {
  const [s, setS] = useState(() => snapshot(game))
  const [muted, setMutedState] = useState(isMuted)
  useEffect(() => {
    const id = window.setInterval(() => setS(snapshot(game)), 100)
    return () => window.clearInterval(id)
  }, [game])
  const bagRatio = s.bagCap ? s.bagUsed / s.bagCap : 0
  const toggleMute = () => {
    setMuted(!muted)
    setMutedState(!muted)
  }
  return (
    <div className="hud" ref={ref}>
      <div className="hud-inner">
        <div className="hud-brand"><span className="gold shadow">芒果園保衛戰</span><small className="gray">{game.run.cfg.label}難度</small></div>
        <div className="hud-top">
          <span className="hud-time shadow" data-testid="timer">{s.time}</span>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="hud-btn" aria-label={muted ? '開啟聲音' : '關閉聲音'} onClick={toggleMute}>
              <svg width="22" height="22" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
                <path d="M0 3h2l2-2v6L2 5H0z" fill="#000" />
                {muted ? <path d="M5 3h1v1H5zM7 3h1v1H7zM6 4h1v1H6zM5 5h1v1H5zM7 5h1v1H7z" fill="#000" /> : <path d="M5 2h1v1H5zM6 3h1v2H6zM5 5h1v1H5z" fill="#000" />}
              </svg>
            </button>
            <button type="button" className="hud-btn" aria-label="暫停" onClick={onPause}><span className="bars"><i /><i /></span></button>
          </div>
        </div>
        {s.badges.length > 0 && (
          <div className="badges">{s.badges.map((b) => <span key={b.text.split(' ')[0]} className="badge" style={{ color: b.color }}>{b.text}</span>)}</div>
        )}
        <div className="res">
          <span data-testid="money"><img src="assets/icon_coin.png" alt="錢" />{s.money}</span>
          <span data-testid="mango"><img src="assets/icon_mango.png" alt="芒果" />{s.mango}</span>
          <span data-testid="banana"><img src="assets/icon_banana.png" alt="香蕉" />{s.banana}</span>
        </div>
        <div className="bar-row">
          背包 {s.bagUsed}/{s.bagCap}
          <div className="bar"><div className={bagRatio >= ECONOMY.bagNearFullRatio ? 'danger' : ''} style={{ width: `${bagRatio * 100}%` }} /></div>
        </div>
        <div className="bar-row">
          危險度 <span className="gold">{s.stars}</span>　猴王 {s.king}
          <div className="bar"><div className="danger" style={{ width: `${s.kingRatio * 100}%` }} /></div>
        </div>
      </div>
    </div>
  )
})
