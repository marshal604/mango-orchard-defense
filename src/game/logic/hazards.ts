import { MARATHON, SHADE, TRAPS } from './config'
import type { Goose } from './entities'
import type { GameMap, Point } from './map'
import { dist } from './map'

export interface Trap { kind: 'locker' | 'drink'; left: number; exit: Point; at: Point }

export interface Marathon {
  path: Point[]
  total: number
  s: number
  dir: 1 | -1
  head: Point
}

// Hazard state for one run. Pure data + functions; Game calls them each step.
export interface HazardState {
  trapped: Trap | null
  armed: boolean
  shaded: boolean
  donated: number
  rushLeft: number
  hypeLeft: number
  marathon: Marathon | null
}

const segLen = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y)

// Point at distance s along the polyline, with its unit direction.
function pointAt(path: Point[], s: number) {
  let rest = Math.max(0, s)
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]
    const b = path[i]
    const len = segLen(a, b)
    if (rest <= len || i === path.length - 1) {
      const t = len ? Math.min(1, rest / len) : 0
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: (b.x - a.x) / (len || 1), dy: (b.y - a.y) / (len || 1) }
    }
    rest -= len
  }
  return { ...path[0], dx: 1, dy: 0 }
}

export function makeHazards(map: GameMap): HazardState {
  const path = map.marathonPath
  const total = path.slice(1).reduce((sum, p, i) => sum + segLen(path[i], p), 0)
  const marathon: Marathon | null = path.length >= 2
    ? { path, total, s: MARATHON.length, dir: 1, head: pointAt(path, MARATHON.length) }
    : null
  return { trapped: null, armed: true, shaded: false, donated: 0, rushLeft: 0, hypeLeft: 0, marathon }
}

export const underShade = (map: GameMap, p: Point) => map.shades.some((s) => dist(p, s) <= SHADE.radius)

const lockerRect = (p: Point) => ({ x: p.x - TRAPS.locker.w / 2, y: p.y - TRAPS.locker.h / 2, w: TRAPS.locker.w, h: TRAPS.locker.h })

export function trapAt(map: GameMap, p: Point): Trap | null {
  for (const l of map.lockers) {
    const r = lockerRect(l)
    if (p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h) {
      return { kind: 'locker', left: TRAPS.locker.lockSec, at: l, exit: { x: l.x, y: r.y + r.h + 24 } }
    }
  }
  for (const r of map.drinks) {
    if (dist(p, r) <= TRAPS.drink.radius) {
      return { kind: 'drink', left: TRAPS.drink.lockSec, at: r, exit: { x: r.x, y: r.y + TRAPS.drink.radius + 24 } }
    }
  }
  return null
}

export function moveMarathon(m: Marathon, dt: number) {
  m.s += m.dir * MARATHON.speed * dt
  if (m.dir === 1 && m.s > m.total) m.dir = -1
  if (m.dir === -1 && m.s < MARATHON.length) m.dir = 1
  const p = pointAt(m.path, m.s)
  m.head = { x: p.x, y: p.y }
}

// Where the player must be pushed so they are not inside the runners, or null if clear.
export function pushOutOfMarathon(m: Marathon, p: Point): Point | null {
  const head = pointAt(m.path, m.s)
  // Runners trail behind the head, opposite to the walking direction.
  const along = ((p.x - head.x) * -head.dx + (p.y - head.y) * -head.dy) * m.dir
  if (along < 0 || along > MARATHON.length) return null
  const side = (p.x - head.x) * -head.dy + (p.y - head.y) * head.dx
  const half = MARATHON.width / 2
  if (Math.abs(side) >= half) return null
  const sign = side >= 0 ? 1 : -1
  const push = sign * half - side
  return { x: p.x - head.dy * push, y: p.y + head.dx * push }
}

export function moltTick(g: Goose, dt: number): number {
  if (g.moltLeft <= 0 || !g.alive) return 0
  g.moltLeft -= dt
  return TRAPS.drink.molt.dps * dt
}

export type TrapStep =
  | { kind: 'free' }
  | { kind: 'locked' }
  | { kind: 'entered'; trap: Trap }
  | { kind: 'released'; trap: Trap }

// Advances the trap lock. A trap re-arms only after the player has left every trap area.
export function stepTrap(h: HazardState, map: GameMap, p: Point, dt: number): TrapStep {
  const trap = h.trapped
  if (trap) {
    trap.left -= dt
    if (trap.left > 0) return { kind: 'locked' }
    h.trapped = null
    return { kind: 'released', trap }
  }
  const found = trapAt(map, p)
  if (!found) {
    h.armed = true
    return { kind: 'free' }
  }
  if (!h.armed) return { kind: 'free' }
  h.armed = false
  h.trapped = found
  return { kind: 'entered', trap: found }
}

// Updates the shaded flag. On stepping under a tent returns the fee to take (0 once fully donated), else null.
export function stepShade(h: HazardState, map: GameMap, p: Point, money: number): number | null {
  const now = underShade(map, p)
  const entered = now && !h.shaded
  h.shaded = now
  if (!entered) return null
  const fee = h.donated >= SHADE.freeAfter ? 0 : money
  h.donated += fee
  return fee
}
