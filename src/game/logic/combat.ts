import { NEST } from './config'
import type { Goose, Nest, Target, Tree } from './entities'
import { gooseStats } from './geese'
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

interface Field { geese: readonly Goose[]; nests: readonly Nest[]; trees: readonly Tree[] }

// Priority: geese chasing the player > any goose > nest > tree the racket can cut.
// `blockedOak` is an old oak in range that the current racket cannot cut (for the upgrade hint).
export function pickTarget(p: Point, range: number, canBigTree: boolean, field: Field) {
  const inRange = (t: Point, r: number) => dist(p, t) <= range + r
  const gooseIn = (g: Goose) => inRange(g, gooseStats(g).hitRadius)
  const target: Target | null = nearest(p, field.geese, (g) => g.target === 'player' && gooseIn(g))
    ?? nearest(p, field.geese, gooseIn)
    ?? nearest(p, field.nests, (n) => inRange(n, NEST.hitRadius))
    ?? nearest(p, field.trees, (t) => (canBigTree || !t.big) && inRange(t, t.hitRadius))
  const blockedOak = target || canBigTree ? null : nearest(p, field.trees, (t) => t.big && inRange(t, t.hitRadius))
  return { target, blockedOak }
}
