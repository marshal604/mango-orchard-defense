import { MONKEY, KING } from './config'
import type { Attacker, Monkey } from './entities'
import type { Point } from './map'

// What monkey AI needs from the world. Implemented by Game.
export interface MonkeyWorld {
  readonly width: number
  readonly height: number
  rng: () => number
  playerPos: Point
  playerAlive: boolean
  sightRadius: number
  isGone: (a: Attacker) => boolean
  sheltered: (a: Attacker) => boolean
  bite: (g: Monkey, a: Attacker) => void
}

export const monkeyStats = (g: Monkey) => {
  if (g.size === 'king') {
    return { speedRatio: KING.speedRatio, biteRange: KING.biteRange, biteInterval: KING.biteInterval, hitRadius: KING.hitRadius }
  }
  const s = MONKEY[g.size]
  return { speedRatio: s.speedRatio, biteRange: MONKEY.biteRange, biteInterval: MONKEY.biteInterval, hitRadius: s.hitRadius }
}

const posOf = (w: MonkeyWorld, a: Attacker): Point => (a === 'player' ? w.playerPos : a)

// Moves toward (x, y); returns true when arrived.
function moveTo(g: Monkey, x: number, y: number, speed: number, dt: number): boolean {
  const dx = x - g.x
  const dy = y - g.y
  const d = Math.hypot(dx, dy)
  const stepLen = speed * dt
  g.facingRight = dx > 0
  if (d <= stepLen) {
    g.x = x
    g.y = y
    return true
  }
  g.x += (dx / d) * stepLen
  g.y += (dy / d) * stepLen
  return false
}

// Every monkey chasing `a` stops; the King walks home, others resume wandering.
export function forget(monkeys: readonly Monkey[], a: Attacker) {
  for (const g of monkeys) {
    if (g.target !== a) continue
    g.target = null
    g.state = g.size === 'king' ? 'return' : 'wander'
  }
}

export function aggro(g: Monkey, a: Attacker) {
  if (!g.alive) return
  g.state = 'chase'
  g.target = a
}

function giveUp(g: Monkey, leashed: boolean) {
  g.state = g.size === 'king' && leashed ? 'return' : 'wander'
  g.target = null
  g.wanderTo = null
}

function wander(w: MonkeyWorld, g: Monkey, speed: number, dt: number) {
  if (g.pauseLeft > 0) {
    g.pauseLeft -= dt
    return
  }
  if (!g.wanderTo) {
    const angle = w.rng() * Math.PI * 2
    const r = w.rng() * MONKEY.wanderRadius
    g.wanderTo = {
      x: Math.min(w.width - 10, Math.max(10, g.home.x + Math.cos(angle) * r)),
      y: Math.min(w.height - 10, Math.max(30, g.home.y + Math.sin(angle) * r)),
    }
  }
  if (moveTo(g, g.wanderTo.x, g.wanderTo.y, speed, dt)) {
    g.wanderTo = null
    const [lo, hi] = MONKEY.wanderPause
    g.pauseLeft = lo + w.rng() * (hi - lo)
  }
}

function chase(w: MonkeyWorld, g: Monkey, speed: number, dt: number) {
  const target = g.target
  if (!target) return giveUp(g, false)
  const stats = monkeyStats(g)
  const pos = posOf(w, target)
  const d = Math.hypot(pos.x - g.x, pos.y - g.y)
  const leashed = g.size === 'king'
    ? Math.hypot(g.x - g.home.x, g.y - g.home.y) > KING.leashRadius
    : d > MONKEY.leashRadius
  if (w.isGone(target) || leashed || w.sheltered(target)) return giveUp(g, leashed)
  if (d > stats.biteRange) {
    moveTo(g, pos.x, pos.y, speed, dt)
    return
  }
  g.biting = true
  g.facingRight = pos.x > g.x
  g.biteCd -= dt
  if (g.biteCd <= 0) {
    g.biteCd = stats.biteInterval
    w.bite(g, target)
  }
}

export function updateMonkey(w: MonkeyWorld, g: Monkey, dt: number) {
  if (!g.alive) return
  g.biting = false
  const speed = MONKEY.baseSpeed * monkeyStats(g).speedRatio
  const sight = g.size === 'king' ? KING.sightRadius : w.sightRadius
  if (g.state === 'wander' && w.playerAlive && Math.hypot(w.playerPos.x - g.x, w.playerPos.y - g.y) <= sight) {
    aggro(g, 'player')
  }
  if (g.state === 'chase') return chase(w, g, speed, dt)
  if (g.state === 'return') {
    if (moveTo(g, g.home.x, g.home.y, speed, dt)) g.state = 'wander'
  } else {
    wander(w, g, speed * MONKEY.wanderSpeedRatio, dt)
  }
  if (g.size === 'king') g.hp = Math.min(g.hpMax, g.hp + KING.regenPerSec * dt)
}
