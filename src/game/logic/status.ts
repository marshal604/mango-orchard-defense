import type { Point } from './map'

export interface PlayerStatus {
  poisonLeft: number
  poisonDps: number
  slowLeft: number
  slowMult: number
  hasteLeft: number
  burnAbilityLeft: number
  lockerLeft: number
  invulnerableUntil: number
  lastHurt: number
  attackCd: number
  swingUntil: number
  facing: 'down' | 'up' | 'left' | 'right'
  moving: boolean
}

export const freshStatus = (): PlayerStatus => ({
  poisonLeft: 0, poisonDps: 0, slowLeft: 0, slowMult: 1, hasteLeft: 0, burnAbilityLeft: 0, lockerLeft: 0,
  invulnerableUntil: 0, lastHurt: 0, attackCd: 0, swingUntil: 0, facing: 'down', moving: false,
})

export function tickBuffs(s: PlayerStatus, dt: number): void {
  if (s.hasteLeft > 0) s.hasteLeft -= dt
  if (s.slowLeft > 0) s.slowLeft -= dt
  if (s.burnAbilityLeft > 0) s.burnAbilityLeft -= dt
}

// Stronger poison wins; duration extends. Returns true when the player was not poisoned before.
export function addPoison(s: PlayerStatus, dps: number, sec: number): boolean {
  const fresh = s.poisonLeft <= 0
  s.poisonDps = fresh ? dps : Math.max(s.poisonDps, dps)
  s.poisonLeft = Math.max(s.poisonLeft, sec)
  return fresh
}

export function addSlow(s: PlayerStatus, mult: number, sec: number): boolean {
  const fresh = s.slowLeft <= 0
  s.slowLeft = Math.max(s.slowLeft, sec)
  s.slowMult = mult
  return fresh
}

export const facingOf = (x: number, y: number): PlayerStatus['facing'] =>
  Math.abs(x) > Math.abs(y) ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down')

export interface PeckEffects {
  poison?: { dps: number; sec: number }
  slow?: { mult: number; sec: number }
}

// Applies a peck's lingering effects; returns which ones newly started (for floating text).
export function applyPeck(s: PlayerStatus, fx: PeckEffects): { poisoned: boolean; slowed: boolean } {
  return {
    poisoned: fx.poison ? addPoison(s, fx.poison.dps, fx.poison.sec) : false,
    slowed: fx.slow ? addSlow(s, fx.slow.mult, fx.slow.sec) : false,
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
  Object.assign(s, { poisonLeft: 0, slowLeft: 0, swingUntil: 0, lockerLeft: 0 })
}
