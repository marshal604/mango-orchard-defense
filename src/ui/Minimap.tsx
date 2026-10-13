import { forwardRef, useEffect, useState } from 'react'
import type { Game } from '../game/logic/game'
import type { Point } from '../game/logic/map'

const W = 96
const ZONE_BG: Record<string, string> = { hills: '#2c6c3c', deep: '#3c4a2a', village: '#4ca83c', town: '#7c7c6c' }
const ZONE_LETTER: Record<string, string> = { hills: '山', deep: '深', village: '村', town: '郊' }
const BUILDING_LETTER: Record<string, string> = { stall: '攤', coop: '農', toolshop: '具', grocery: '柑' }

interface Props { game: Game; target: Point | null }

export const Minimap = forwardRef<HTMLDivElement, Props>(function Minimap({ game, target }, ref) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 250)
    return () => window.clearInterval(id)
  }, [])
  const s = W / game.map.width
  const h = game.map.height * s
  const pos = (p: Point, size: number) => ({ left: p.x * s - size / 2, top: p.y * s - size / 2 })
  return (
    <div className="minimap" style={{ height: h }} ref={ref} aria-hidden="true">
      {game.map.zones.map((z) => (
        <div key={z.id} className="zone" style={{ left: z.rect.x * s, top: z.rect.y * s, width: z.rect.w * s, height: z.rect.h * s, background: ZONE_BG[z.id] }}>
          {ZONE_LETTER[z.id]}
        </div>
      ))}
      {game.map.buildings.map((b) => {
        const isTarget = !!target && Math.abs(target.x - b.x) < 5
        return <div key={b.id} className={`dot bld${isTarget ? ' target' : ''}`} style={pos(b, 11)}>{BUILDING_LETTER[b.id]}</div>
      })}
      {game.king.alive && <div className="dot king" style={pos(game.king, 8)} />}
      <div className="dot me" style={pos(game.player, 6)} />
    </div>
  )
})
