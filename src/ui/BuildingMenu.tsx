import { useEffect, useState } from 'react'
import type { BuildingId, Track } from '../game/logic/config'
import { UPGRADES } from '../game/logic/config'
import type { Game } from '../game/logic/game'
import { maxLevel } from '../game/logic/run'
import { upgradeDesc } from './upgradeText'

const TRACKS = Object.keys(UPGRADES) as Track[]

// Bottom sheet that opens while the player stands on a shop pad.
export function BuildingMenu({ game }: { game: Game }) {
  const [pad, setPad] = useState<BuildingId | null>(null)
  const [dismissed, setDismissed] = useState<BuildingId | null>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = game.currentPad()
      setPad(now)
      setDismissed((d) => (d === now ? d : null))
      setTick((t) => t + 1)
    }, 100)
    return () => window.clearInterval(id)
  }, [game])

  if (!pad || pad === 'stall' || pad === dismissed) return null
  const building = game.map.buildings.find((b) => b.id === pad)
  const run = game.run
  return (
    <div className="sheet" role="dialog" aria-label={building?.name}>
      <div className="sheet-head">
        <h2>{building?.name}</h2>
        <span className="sheet-money">${run.money}</span>
        <button type="button" className="hud-btn" aria-label="關閉" onClick={() => setDismissed(pad)}>X</button>
      </div>
      {TRACKS.filter((t) => UPGRADES[t].building === pad).map((t) => {
        const price = run.price(t)
        const maxed = price === null
        return (
          <div className="sheet-item" key={t}>
            <div>
              <div>{UPGRADES[t].name} <small>Lv {run.levels[t]}/{maxLevel(t)}</small></div>
              <small>{upgradeDesc(t, run.levels, run.difficulty, run.perks)}</small>
            </div>
            <button
              type="button"
              className="btn btn-gold"
              disabled={maxed || run.money < price}
              onClick={() => game.buy(t)}
            >
              {maxed ? '已滿' : `$${price}`}
            </button>
          </div>
        )
      })}
    </div>
  )
}
