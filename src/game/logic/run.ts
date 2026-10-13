import type { Difficulty, Racket, Resource, Track } from './config'
import { COMBAT, DIFFICULTY, ECONOMY, PLAYER, RACKETS } from './config'

export type Levels = Record<Track, number>

export interface Perks { discount: boolean; complaints: boolean }

const zeroLevels = (): Levels => ({
  bag: 0, price: 0, window: 0, delivery: 0,
  ballboy: 0, wrangler: 0, workerTool: 0, cart: 0,
  racket: 0, range: 0, shoes: 0, armor: 0,
})

export const bagCap = (levels: Levels, d: Difficulty) => DIFFICULTY[d].bagBase + levels.bag * ECONOMY.bagPerLevel
export const hpMaxOf = (levels: Levels, d: Difficulty) => Math.round(DIFFICULTY[d].hpMax * (1 + levels.armor * ECONOMY.hpPerArmor))
export const racketOf = (levels: Levels): Racket | undefined => RACKETS[levels.racket]
export const attackRange = (levels: Levels) => COMBAT.ranges[levels.range]
export const playerSpeed = (levels: Levels) => PLAYER.speed * (1 + levels.shoes * ECONOMY.speedPerShoes)

// Economy and progression for one Run. No positions, no timers.
export class RunState {
  readonly difficulty: Difficulty
  levels: Levels = zeroLevels()
  money = 0
  cork = 0
  feather = 0
  hp: number
  dead = false
  perks: Perks = { discount: false, complaints: false }
  stats = { trees: 0, geese: 0, nests: 0, earned: 0, deaths: 0 }

  constructor(difficulty: Difficulty) {
    this.difficulty = difficulty
    this.hp = DIFFICULTY[difficulty].hpMax
  }

  get cfg() { return DIFFICULTY[this.difficulty] }
  get bagCap() { return bagCap(this.levels, this.difficulty) }
  get bagUsed() { return this.cork + this.feather }
  get bagFree() { return Math.max(0, this.bagCap - this.bagUsed) }
  get hpMax() { return hpMaxOf(this.levels, this.difficulty) }

  // Adds up to the free bag space; returns the amount that did not fit.
  add(kind: Resource, amount: number): number {
    const taken = Math.min(amount, this.bagFree)
    this[kind] += taken
    return amount - taken
  }

  earn(amount: number) {
    this.money += amount
    this.stats.earned += amount
  }
}
