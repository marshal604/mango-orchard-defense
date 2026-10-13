import { PROCESSION, PAVILION, TRAPS } from './config'
import type { Monkey } from './entities'
import type { GameMap, Point } from './map'
import { dist } from './map'
import type { TrapKind } from './messages'

export interface Trap { kind: TrapKind; left: number; exit: Point; at: Point }

export interface Procession {
  path: Point[]
  total: number
  s: number
  dir: 1 | -1
  head: Point
}

// Hazard state for one run. Pure data + functions; Game calls them each step.
// Player-side effects (bellyache, chilli hands) live in PlayerStatus.
export interface HazardState {
  trapped: Trap | null
  armed: boolean
  inPavilion: boolean
  donated: number
  procession: Procession | null
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
  const path = map.processionPath
  const total = path.slice(1).reduce((sum, p, i) => sum + segLen(path[i], p), 0)
  const procession: Procession | null = path.length >= 2
    ? { path, total, s: PROCESSION.length, dir: 1, head: pointAt(path, PROCESSION.length) }
    : null
  return { trapped: null, armed: true, inPavilion: false, donated: 0, procession }
}

export const underPavilion = (map: GameMap, p: Point) => map.pavilions.some((s) => dist(p, s) <= PAVILION.radius)

const iceShopRect = (p: Point) => ({ x: p.x - TRAPS.ice.w / 2, y: p.y - TRAPS.ice.h / 2, w: TRAPS.ice.w, h: TRAPS.ice.h })

export function trapAt(map: GameMap, p: Point): Trap | null {
  for (const l of map.iceShops) {
    const r = iceShopRect(l)
    if (p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h) {
      return { kind: 'ice', left: TRAPS.ice.lockSec, at: l, exit: { x: l.x, y: r.y + r.h + 24 } }
    }
  }
  for (const r of map.chiliFields) {
    if (dist(p, r) <= TRAPS.chili.radius) {
      return { kind: 'chili', left: TRAPS.chili.lockSec, at: r, exit: { x: r.x, y: r.y + TRAPS.chili.radius + 24 } }
    }
  }
  return null
}

export function moveProcession(m: Procession, dt: number) {
  m.s += m.dir * PROCESSION.speed * dt
  if (m.dir === 1 && m.s > m.total) m.dir = -1
  if (m.dir === -1 && m.s < PROCESSION.length) m.dir = 1
  const p = pointAt(m.path, m.s)
  m.head = { x: p.x, y: p.y }
}

// Where the player must be pushed so they are not inside the runners, or null if clear.
export function pushOutOfProcession(m: Procession, p: Point): Point | null {
  const head = pointAt(m.path, m.s)
  // Runners trail behind the head, opposite to the walking direction.
  const along = ((p.x - head.x) * -head.dx + (p.y - head.y) * -head.dy) * m.dir
  if (along < 0 || along > PROCESSION.length) return null
  const side = (p.x - head.x) * -head.dy + (p.y - head.y) * head.dx
  const half = PROCESSION.width / 2
  if (Math.abs(side) >= half) return null
  const sign = side >= 0 ? 1 : -1
  const push = sign * half - side
  return { x: p.x - head.dy * push, y: p.y + head.dx * push }
}

export function spicyTick(g: Monkey, dt: number): number {
  if (g.spicyLeft <= 0 || !g.alive) return 0
  g.spicyLeft -= dt
  return TRAPS.chili.spicy.dps * dt
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

// Updates the inPavilion flag. On stepping under a tent returns the fee to take (0 once fully donated), else null.
export function stepPavilion(h: HazardState, map: GameMap, p: Point, money: number): number | null {
  const now = underPavilion(map, p)
  const entered = now && !h.inPavilion
  h.inPavilion = now
  if (!entered) return null
  const fee = h.donated >= PAVILION.freeAfter ? 0 : money
  h.donated += fee
  return fee
}
