import { DIFFICULTY, MONKEY, KING, DEN, TREE } from './config'
import type { Difficulty } from './config'
import type { Monkey, MonkeySize, Den, Tree } from './entities'
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

export function makeMonkey(map: GameMap, p: Point, size: MonkeySize, difficulty: Difficulty, den: Den | null = null): Monkey {
  const hp = size === 'king' ? DIFFICULTY[difficulty].king.hp : MONKEY[size].hp
  return {
    kind: 'monkey', id: newId(), x: p.x, y: p.y, size, hp, hpMax: hp, alive: true,
    zone: zoneAt(map, p), home: { ...p }, state: 'wander', target: null, wanderTo: null,
    pauseLeft: 0, biteCd: 0, spicyLeft: 0, den, lockedBy: null, facingRight: false, biting: false,
  }
}

export function makeDen(map: GameMap, p: Point): Den {
  return {
    kind: 'den', id: newId(), x: p.x, y: p.y, hp: DEN.hp, alive: true,
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
  const monkeys: Monkey[] = []
  const dens: Den[] = []
  for (const zone of map.zones) {
    const c = zone.counts
    const repeat = (n: number, fn: () => void) => { for (let i = 0; i < n; i++) fn() }
    repeat(c.bigTree, () => { const p = place(pl, zone, MIN_SPACING.big); if (p) trees.push(makeTree(map, p, true)) })
    repeat(c.smallTree, () => { const p = place(pl, zone, MIN_SPACING.small); if (p) trees.push(makeTree(map, p, false)) })
    repeat(c.den, () => { const p = place(pl, zone, MIN_SPACING.big); if (p) dens.push(makeDen(map, p)) })
    repeat(c.monkey, () => monkeys.push(makeMonkey(map, randomPoint(pl, zone), 'small', difficulty)))
    repeat(c.bigMonkey, () => monkeys.push(makeMonkey(map, randomPoint(pl, zone), 'big', difficulty)))
  }
  const deep = map.zones.find((z) => z.id === 'deep')
  const hasGeese = map.zones.some((z) => z.counts.monkey + z.counts.bigMonkey > 0)
  if (deep && hasGeese) {
    for (let i = 0; i < DIFFICULTY[difficulty].extraBigMonkeys; i++) {
      monkeys.push(makeMonkey(map, randomPoint(pl, deep), 'big', difficulty))
    }
  }
  return { trees, monkeys, dens }
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// Regrows destroyed dens and returns spawn points for new monkeys (the caller links them to the den).
export function tickDens(dens: readonly Den[], dt: number, every: number, rng: () => number, map: GameMap) {
  const spawns: { den: Den; at: Point }[] = []
  for (const n of dens) {
    if (!n.alive) {
      n.respawnLeft -= dt
      if (n.respawnLeft <= 0) Object.assign(n, { alive: true, hp: DEN.hp, spawnCd: 0 })
      continue
    }
    n.spawnCd += dt
    if (n.spawnCd < every) continue
    n.spawnCd = 0
    if (n.children >= DEN.maxAlive) continue
    const angle = rng() * Math.PI * 2
    spawns.push({
      den: n,
      at: {
        x: clamp(n.x + Math.cos(angle) * DEN.spawnRadius, 10, map.width - 10),
        y: clamp(n.y + Math.sin(angle) * DEN.spawnRadius, 30, map.height - 10),
      },
    })
  }
  return spawns
}
