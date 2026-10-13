import type { Point } from './map'

export interface PlayerStatus {
  scrapeLeft: number
  scrapeDps: number
  sprainLeft: number
  sprainMult: number
  hasteLeft: number
  hypeLeft: number
  rushLeft: number
  invulnerableUntil: number
  lastHurt: number
  attackCd: number
  swingUntil: number
  facing: 'down' | 'up' | 'left' | 'right'
  moving: boolean
}

export const freshStatus = (): PlayerStatus => ({
  scrapeLeft: 0, scrapeDps: 0, sprainLeft: 0, sprainMult: 1, hasteLeft: 0, hypeLeft: 0, rushLeft: 0,
  invulnerableUntil: 0, lastHurt: 0, attackCd: 0, swingUntil: 0, facing: 'down', moving: false,
})

export function tickBuffs(s: PlayerStatus, dt: number): void {
  if (s.hasteLeft > 0) s.hasteLeft -= dt
  if (s.sprainLeft > 0) s.sprainLeft -= dt
  if (s.hypeLeft > 0) s.hypeLeft -= dt
}

// Deeper scrape wins; duration extends. Returns true when the player was not already bleeding.
export function addScrape(s: PlayerStatus, dps: number, sec: number): boolean {
  const fresh = s.scrapeLeft <= 0
  s.scrapeDps = fresh ? dps : Math.max(s.scrapeDps, dps)
  s.scrapeLeft = Math.max(s.scrapeLeft, sec)
  return fresh
}

export function addSprain(s: PlayerStatus, mult: number, sec: number): boolean {
  const fresh = s.sprainLeft <= 0
  s.sprainLeft = Math.max(s.sprainLeft, sec)
  s.sprainMult = mult
  return fresh
}

export const facingOf = (x: number, y: number): PlayerStatus['facing'] =>
  Math.abs(x) > Math.abs(y) ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down')

export interface PeckEffects {
  scrape?: { dps: number; sec: number }
  sprain?: { mult: number; sec: number }
}

// Applies a peck's lingering effects; returns which ones newly started (for floating text).
export function applyPeck(s: PlayerStatus, fx: PeckEffects): { scraped: boolean; sprained: boolean } {
  return {
    scraped: fx.scrape ? addScrape(s, fx.scrape.dps, fx.scrape.sec) : false,
    sprained: fx.sprain ? addSprain(s, fx.sprain.mult, fx.sprain.sec) : false,
  }
}

// Moves p by the (up to unit-length) input vector at `speed`, clamped to the world. Returns false when idle.
export function walk(p: Point, move: Point, speed: number, dt: number, world: { width: number; height: number }): boolean {
  const len = Math.hypot(move.x, move.y)
  if (len === 0) return false
  const scale = (Math.min(1, len) * speed * dt) / len
  p.x = Math.min(world.width - 10, Math.max(10, p.x + move.x * scale))
  p.y = Math.min(world.height, Math.max(30, p.y + move.y * scale))
  return true
}

export function clearAilments(s: PlayerStatus): void {
  Object.assign(s, { scrapeLeft: 0, sprainLeft: 0, swingUntil: 0, rushLeft: 0 })
}
