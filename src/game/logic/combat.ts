import { DEN } from './config'
import type { Monkey, Den, Target, Tree } from './entities'
import { monkeyStats } from './monkeys'
import type { Point } from './map'
import { dist } from './map'

function nearest<T extends Target>(p: Point, list: readonly T[], ok: (t: T) => boolean): T | null {
  let best: T | null = null
  let bestD = Infinity
  for (const t of list) {
    if (!t.alive || !ok(t)) continue
    const d = dist(p, t)
    if (d < bestD) { bestD = d; best = t }
  }
  return best
}

interface Field { monkeys: readonly Monkey[]; dens: readonly Den[]; trees: readonly Tree[] }

// Priority: monkeys chasing the player > any monkey > den > tree the tool can cut.
// `blockedOak` is an old oak in range that the current tool cannot cut (for the upgrade hint).
export function pickTarget(p: Point, range: number, canBigTree: boolean, field: Field) {
  const inRange = (t: Point, r: number) => dist(p, t) <= range + r
  const monkeyIn = (g: Monkey) => inRange(g, monkeyStats(g).hitRadius)
  const target: Target | null = nearest(p, field.monkeys, (g) => g.target === 'player' && monkeyIn(g))
    ?? nearest(p, field.monkeys, monkeyIn)
    ?? nearest(p, field.dens, (n) => inRange(n, DEN.hitRadius))
    ?? nearest(p, field.trees, (t) => (canBigTree || !t.big) && inRange(t, t.hitRadius))
  const blockedOak = target || canBigTree ? null : nearest(p, field.trees, (t) => t.big && inRange(t, t.hitRadius))
  return { target, blockedOak }
}
