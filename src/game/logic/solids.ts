import type { Tree } from './entities'
import type { Building, Point } from './map'

// Living tree trunks and the lower body of each building block the player (docs/feel-reference.md 1:
// "feet box" collides with building zones bodyFrac {w 0.85, h 0.5} and tree trunks). Harvested trees are walkable.

const FEET_RADIUS = 10
const TRUNK_RADIUS = { small: 8, big: 14 }
const BODY = { w: 0.85, h: 0.5 }

function pushOutOfCircle(p: Point, c: Point, r: number) {
  const dx = p.x - c.x
  const dy = p.y - c.y
  const d = Math.hypot(dx, dy)
  const min = r + FEET_RADIUS
  if (d >= min) return
  // Exactly on the centre: push straight down so the player never gets stuck.
  const nx = d === 0 ? 0 : dx / d
  const ny = d === 0 ? 1 : dy / d
  p.x = c.x + nx * min
  p.y = c.y + ny * min
}

function pushOutOfRect(p: Point, b: Building) {
  const left = b.x - (b.w * BODY.w) / 2
  const right = b.x + (b.w * BODY.w) / 2
  const bottom = b.y + b.h / 2
  const top = bottom - b.h * BODY.h
  const cx = Math.max(left, Math.min(p.x, right))
  const cy = Math.max(top, Math.min(p.y, bottom))
  const dx = p.x - cx
  const dy = p.y - cy
  const d = Math.hypot(dx, dy)
  if (d >= FEET_RADIUS) return
  if (d > 0) {
    p.x = cx + (dx / d) * FEET_RADIUS
    p.y = cy + (dy / d) * FEET_RADIUS
    return
  }
  // Centre inside the body: leave through the nearest edge.
  const exits = [
    { d: p.x - left, x: left - FEET_RADIUS, y: p.y },
    { d: right - p.x, x: right + FEET_RADIUS, y: p.y },
    { d: p.y - top, x: p.x, y: top - FEET_RADIUS },
    { d: bottom - p.y, x: p.x, y: bottom + FEET_RADIUS },
  ]
  const exit = exits.reduce((a, e) => (e.d < a.d ? e : a))
  p.x = exit.x
  p.y = exit.y
}

export function pushOutOfSolids(p: Point, trees: readonly Tree[], buildings: readonly Building[]) {
  for (const t of trees) {
    if (!t.alive || Math.abs(t.x - p.x) > 40 || Math.abs(t.y - p.y) > 40) continue
    pushOutOfCircle(p, t, t.big ? TRUNK_RADIUS.big : TRUNK_RADIUS.small)
  }
  for (const b of buildings) pushOutOfRect(p, b)
}
