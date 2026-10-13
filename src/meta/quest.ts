import type { Track } from '../game/logic/config'
import { ECONOMY, SUGGEST_ORDER, UPGRADES } from '../game/logic/config'
import type { Game } from '../game/logic/game'
import type { Point } from '../game/logic/map'
import { dist, padOf } from '../game/logic/map'
import { racketOf } from '../game/logic/run'

export type Goal =
  | { kind: 'sell'; text: string; target: Point }
  | { kind: 'buy'; track: Track; text: string; target: Point }
  | { kind: 'king'; text: string; target: Point }
  | { kind: 'gather'; text: string; target: Point | null }

const READY_FOR_KING = { racket: 3, armor: 2 }

function nearestHarvest(game: Game): Point | null {
  const canBig = racketOf(game.run.levels)?.canBigTree ?? false
  const options = [
    ...game.trees.filter((t) => t.alive && (canBig || !t.big)),
    ...game.geese.filter((g) => g.alive && g.size !== 'king' && g.zone.id === game.zone),
  ]
  let best: Point | null = null
  let bestD = Infinity
  for (const o of options) {
    const d = dist(game.player, o)
    if (d < bestD) { bestD = d; best = o }
  }
  return best
}

// The single next thing the quest panel and gold arrow should point at.
export function nextGoal(game: Game): Goal {
  const run = game.run
  const padFor = (id: string) => {
    const b = game.map.buildings.find((x) => x.id === id) ?? game.map.buildings[0]
    return { name: b.name, target: padOf(b) }
  }
  if (run.bagUsed >= run.bagCap * ECONOMY.bagNearFullRatio) {
    const stall = padFor('stall')
    return { kind: 'sell', text: `背包快滿了，回${stall.name}賣掉`, target: stall.target }
  }
  if (run.levels.racket >= READY_FOR_KING.racket && run.levels.armor >= READY_FOR_KING.armor) {
    return { kind: 'king', text: '裝備夠了！去西南濕地打倒鵝王', target: { x: game.king.x, y: game.king.y } }
  }
  const track = SUGGEST_ORDER.find((t) => run.price(t) !== null)
  const price = track ? run.price(track) : null
  if (track && price !== null && run.money >= price) {
    const b = padFor(UPGRADES[track].building)
    return { kind: 'buy', track, text: `去${b.name}買「${UPGRADES[track].name}」（$${price}）`, target: b.target }
  }
  const need = track && price !== null ? `，還差 $${price - run.money} 買「${UPGRADES[track].name}」` : ''
  return { kind: 'gather', text: `砍樹、趕鵝賺錢${need}`, target: nearestHarvest(game) }
}
