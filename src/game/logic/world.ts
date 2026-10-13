import { DIFFICULTY, GOOSE, KING, NEST, TREE } from './config'
import type { Difficulty } from './config'
import type { Goose, GooseSize, Nest, Tree } from './entities'
import type { GameMap, Point, Zone } from './map'
import { dist, zoneAt } from './map'

let nextId = 1
export const newId = () => nextId++

export function makeTree(map: GameMap, p: Point, big: boolean): Tree {
  const t = big ? TREE.big : TREE.small
  return {
    kind: 'tree', id: newId(), x: p.x, y: p.y, big, hp: t.hp, hitRadius: t.hitRadius,
    alive: true, zone: zoneAt(map, p), lockedBy: null,
  }
}

export function makeGoose(map: GameMap, p: Point, size: GooseSize, difficulty: Difficulty, nest: Nest | null = null): Goose {
  const hp = size === 'king' ? DIFFICULTY[difficulty].king.hp : GOOSE[size].hp
  return {
    kind: 'goose', id: newId(), x: p.x, y: p.y, size, hp, hpMax: hp, alive: true,
    zone: zoneAt(map, p), home: { ...p }, state: 'wander', target: null, wanderTo: null,
    pauseLeft: 0, biteCd: 0, burnLeft: 0, nest, lockedBy: null, facingRight: false, biting: false,
  }
}

export function makeNest(map: GameMap, p: Point): Nest {
  return {
    kind: 'nest', id: newId(), x: p.x, y: p.y, hp: NEST.hp, alive: true,
    zone: zoneAt(map, p), children: 0, spawnCd: 0, respawnLeft: 0,
  }
}

const BUILDING_CLEAR = 220
const MIN_SPACING = { small: 40, big: 64 }

interface Placer { rng: () => number; map: GameMap; taken: Point[] }

function randomPoint(pl: Placer, zone: Zone, inset = 30): Point {
  const r = zone.rect
  return {
    x: r.x + inset + pl.rng() * (r.w - inset * 2),
    y: r.y + inset + pl.rng() * (r.h - inset * 2),
  }
}

function isClear(pl: Placer, p: Point, spacing: number): boolean {
  if (pl.map.buildings.some((b) => dist(p, b) < BUILDING_CLEAR)) return false
  if (dist(p, KING.home) < KING.clearRadius) return false
  return pl.taken.every((q) => dist(p, q) >= spacing)
}

// Tries a bounded number of random spots; gives up silently when the zone is crowded.
function place(pl: Placer, zone: Zone, spacing: number): Point | null {
  for (let i = 0; i < 40; i++) {
    const p = randomPoint(pl, zone)
    if (isClear(pl, p, spacing)) {
      pl.taken.push(p)
      return p
    }
  }
  return null
}

export function populate(map: GameMap, rng: () => number, difficulty: Difficulty) {
  const pl: Placer = { rng, map, taken: [] }
  const trees: Tree[] = []
  const geese: Goose[] = []
  const nests: Nest[] = []
  for (const zone of map.zones) {
    const c = zone.counts
    const repeat = (n: number, fn: () => void) => { for (let i = 0; i < n; i++) fn() }
    repeat(c.bigTree, () => { const p = place(pl, zone, MIN_SPACING.big); if (p) trees.push(makeTree(map, p, true)) })
    repeat(c.smallTree, () => { const p = place(pl, zone, MIN_SPACING.small); if (p) trees.push(makeTree(map, p, false)) })
    repeat(c.nest, () => { const p = place(pl, zone, MIN_SPACING.big); if (p) nests.push(makeNest(map, p)) })
    repeat(c.goose, () => geese.push(makeGoose(map, randomPoint(pl, zone), 'small', difficulty)))
    repeat(c.bigGoose, () => geese.push(makeGoose(map, randomPoint(pl, zone), 'big', difficulty)))
  }
  const wetland = map.zones.find((z) => z.id === 'wetland')
  const hasGeese = map.zones.some((z) => z.counts.goose + z.counts.bigGoose > 0)
  if (wetland && hasGeese) {
    for (let i = 0; i < DIFFICULTY[difficulty].extraBigGeese; i++) {
      geese.push(makeGoose(map, randomPoint(pl, wetland), 'big', difficulty))
    }
  }
  return { trees, geese, nests }
}
