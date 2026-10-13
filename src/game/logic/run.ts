import type { Difficulty, Tool, Resource, Track } from './config'
import { COMBAT, DIFFICULTY, ECONOMY, MILESTONES, PLAYER, TOOLS, UPGRADES } from './config'

export type Levels = Record<Track, number>

export interface Perks { discount: boolean; overwork: boolean }

const zeroLevels = (): Levels => ({
  bag: 0, price: 0, window: 0, delivery: 0,
  picker: 0, ranger: 0, workerTool: 0, cart: 0,
  tool: 0, range: 0, shoes: 0, armor: 0,
})

export const bagCap = (levels: Levels, d: Difficulty) => DIFFICULTY[d].bagBase + levels.bag * ECONOMY.bagPerLevel
export const hpMaxOf = (levels: Levels, d: Difficulty) => Math.round(DIFFICULTY[d].hpMax * (1 + levels.armor * ECONOMY.hpPerArmor))
export const toolOf = (levels: Levels): Tool | undefined => TOOLS[levels.tool]
export const attackRange = (levels: Levels) => COMBAT.ranges[levels.range]
export const sellPrice = (kind: Resource, levels: Levels) =>
  Math.round(ECONOMY.price[kind] * (1 + levels.price * ECONOMY.priceBoostPerLevel))
export const sellInterval = (levels: Levels) => ECONOMY.sellIntervals[levels.window]
export const maxLevel = (t: Track) => UPGRADES[t].prices.length

// null = already at max level.
export function upgradePrice(t: Track, level: number, d: Difficulty, perks: Perks): number | null {
  const base = UPGRADES[t].prices[level]
  if (base === undefined) return null
  return Math.round(base * DIFFICULTY[d].priceMult * (perks.discount ? MILESTONES.discount : 1))
}

export const playerSpeed = (levels: Levels) => PLAYER.speed * (1 + levels.shoes * ECONOMY.speedPerShoes)

// Economy and progression for one Run. No positions, no timers.
export class RunState {
  readonly difficulty: Difficulty
  levels: Levels = zeroLevels()
  money = 0
  mango = 0
  banana = 0
  hp: number
  dead = false
  perks: Perks = { discount: false, overwork: false }
  stats = { trees: 0, monkeys: 0, dens: 0, earned: 0, deaths: 0 }

  constructor(difficulty: Difficulty) {
    this.difficulty = difficulty
    this.hp = DIFFICULTY[difficulty].hpMax
  }

  get cfg() { return DIFFICULTY[this.difficulty] }
  get bagCap() { return bagCap(this.levels, this.difficulty) }
  get bagUsed() { return this.mango + this.banana }
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

  // Sells one item (bananas first); returns what was sold, or null when the bag is empty.
  sellOne(): Resource | null {
    const kind: Resource | null = this.banana > 0 ? 'banana' : this.mango > 0 ? 'mango' : null
    if (!kind) return null
    this[kind]--
    this.earn(sellPrice(kind, this.levels))
    return kind
  }

  sellAll(): number {
    const total = this.mango * sellPrice('mango', this.levels) + this.banana * sellPrice('banana', this.levels)
    this.mango = 0
    this.banana = 0
    this.earn(total)
    return total
  }

  price(t: Track): number | null {
    return upgradePrice(t, this.levels[t], this.difficulty, this.perks)
  }

  buy(t: Track): boolean {
    const cost = this.price(t)
    if (cost === null || this.money < cost) return false
    const before = this.hpMax
    this.money -= cost
    this.levels = { ...this.levels, [t]: this.levels[t] + 1 }
    if (t === 'armor') this.hp += this.hpMax - before
    return true
  }
}
