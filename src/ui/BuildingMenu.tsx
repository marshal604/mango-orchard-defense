import { useEffect, useRef, useState } from 'react'
import type { BuildingId, Track } from '../game/logic/config'
import { UPGRADES } from '../game/logic/config'
import type { Game } from '../game/logic/game'
import { maxLevel } from '../game/logic/run'
import { upgradeDesc } from './upgradeText'

const TRACKS = Object.keys(UPGRADES) as Track[]

const BUILDING_DESC: Record<BuildingId, string> = {
  stall: '客人排隊跟你買水果',
  coop: '請工人幫你採收、趕猴子',
  toolshop: '採果工具、範圍、雨鞋、護具',
  grocery: '背包、收購價、販賣速度、宅配',
}

const trackIcon = (t: Track): string => {
  if (t === 'tool' || t === 'range') return 'icon_tool'
  if (t === 'picker' || t === 'workerTool' || t === 'cart') return 'picker_walk_side_0'
  if (t === 'ranger') return 'ranger_walk_side_0'
  if (t === 'bag' || t === 'price' || t === 'window' || t === 'delivery') return 'icon_mango'
  return 'player_walk_down_0'
}

interface Props {
  game: Game
  open: BuildingId | null
  suggest: Track | null
  onClose: () => void
}

// Bottom sheet (docs/ui-reference.md 2.4). Opening does not pause the run.
export function BuildingMenu({ game, open, suggest, onClose }: Props) {
  const [, tick] = useState(0)
  const [shake, setShake] = useState<Track | null>(null)
  const [popped, setPopped] = useState<Track | null>(null)
  const suggestRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 150)
    return () => window.clearInterval(id)
  }, [])
  useEffect(() => {
    suggestRef.current?.scrollIntoView({ block: 'nearest' })
  }, [open, suggest])

  if (!open || open === 'stall') return null
  const b = game.map.buildings.find((x) => x.id === open)
  const run = game.run
  const buy = (t: Track) => {
    if (game.buy(t)) {
      setPopped(t)
      window.setTimeout(() => setPopped(null), 400)
    } else {
      setShake(t)
      window.setTimeout(() => setShake(null), 320)
    }
  }
  return (
    <section className="sheet" role="dialog" aria-label={b?.name}>
      <div className="sheet-head">
        <img src={`assets/${open}.png`} alt="" />
        <div>
          <h2>{b?.name}</h2>
          <p>{BUILDING_DESC[open]}</p>
        </div>
        <button type="button" className="sheet-close" aria-label="關閉" onClick={onClose}>✕</button>
      </div>
      <ul className="sheet-list">
        {TRACKS.filter((t) => UPGRADES[t].building === open).map((t) => {
          const price = run.price(t)
          const maxed = price === null
          const poor = !maxed && run.money < price
          const isSuggest = t === suggest
          return (
            <li key={t} ref={isSuggest ? suggestRef : undefined} className={`sheet-row${isSuggest ? ' suggest' : ''}`}>
              <div className="icon-cell"><img src={`assets/${trackIcon(t)}.png`} alt="" /></div>
              <div className={popped === t ? 'pop' : ''}>
                <div className="name">{UPGRADES[t].name}<span className="lv">Lv {run.levels[t]}/{maxLevel(t)}</span></div>
                <div className="desc">{upgradeDesc(t, run.levels, run.difficulty, run.perks)}</div>
              </div>
              <button
                type="button"
                className={`buy${maxed ? ' maxed' : poor ? ' poor' : ''}${shake === t ? ' shake' : ''}`}
                disabled={maxed}
                onClick={() => buy(t)}
              >
                {maxed ? '已滿級' : <><img src="assets/icon_coin.png" alt="" />{price}</>}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="sheet-foot">走離建築會自動關閉．選單開著計時不停</div>
    </section>
  )
}
