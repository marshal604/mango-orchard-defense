import { COMBAT, MILESTONES, WORKER } from './config'
import type { Monkey, Pile, Tree, Worker } from './entities'
import { monkeyStats } from './monkeys'
import type { Point } from './map'
import type { Levels, Perks } from './run'
import { sellPrice } from './run'

// What worker AI needs from the world. Implemented by Game.
export interface WorkerWorld {
  rng: () => number
  trees: readonly Tree[]
  monkeys: readonly Monkey[]
  piles: readonly Pile[]
  levels: Levels
  perks: Perks
  coopPad: Point
  stallPad: Point
  takePile: (pile: Pile, w: Worker) => void
  sellWorkerBag: (w: Worker) => void
  hit: (target: Tree | Monkey, damage: number, by: Worker) => void
}

export const workerBagCap = (levels: Levels) => WORKER.bags[levels.cart]
export const workerBagFree = (w: Worker, levels: Levels) => Math.max(0, workerBagCap(levels) - w.mango - w.banana)

export const workerInterval = (levels: Levels, perks: Perks) =>
  (WORKER.interval / (1 + levels.workerTool * WORKER.toolSpeedPerLevel)) *
  (perks.overwork ? MILESTONES.overworkWorkerSlow : 1)

export function makeWorker(kind: Worker['kind'], at: Point): Worker {
  return {
    kind, x: at.x, y: at.y, hp: WORKER.hp, state: 'idle', target: null,
    mango: 0, banana: 0, cd: 0, hitPending: false, downLeft: 0, idleTo: null,
  }
}

function moveTo(w: Worker, p: Point, dt: number): boolean {
  const dx = p.x - w.x
  const dy = p.y - w.y
  const d = Math.hypot(dx, dy)
  const stepLen = WORKER.speed * dt
  if (d <= stepLen) {
    w.x = p.x
    w.y = p.y
    return true
  }
  w.x += (dx / d) * stepLen
  w.y += (dy / d) * stepLen
  return false
}

function release(w: Worker) {
  if (w.target) w.target.lockedBy = null
  w.target = null
  w.hitPending = false
}

function findTarget(world: WorkerWorld, w: Worker): Tree | Monkey | null {
  const pool: readonly (Tree | Monkey)[] = w.kind === 'picker'
    ? world.trees.filter((t) => !t.big)
    : world.monkeys.filter((g) => g.size !== 'king')
  let best: Tree | Monkey | null = null
  let bestD = Infinity
  for (const t of pool) {
    if (!t.alive || t.lockedBy) continue
    const d = Math.hypot(t.x - world.coopPad.x, t.y - world.coopPad.y)
    if (d < bestD) { bestD = d; best = t }
  }
  return best
}

function loiter(world: WorkerWorld, w: Worker, dt: number) {
  if (!w.idleTo) {
    const s = WORKER.idleSpread
    w.idleTo = { x: world.coopPad.x + (world.rng() * 2 - 1) * s, y: world.coopPad.y + 10 + world.rng() * (s - 10) }
  }
  moveTo(w, w.idleTo, dt)
}

function work(world: WorkerWorld, w: Worker, dt: number) {
  const t = w.target
  if (!t) return
  const reach = WORKER.range + (t.kind === 'tree' ? t.hitRadius : monkeyStats(t).hitRadius)
  if (Math.hypot(t.x - w.x, t.y - w.y) > reach) {
    moveTo(w, t, dt)
    return
  }
  // Same rhythm as the player: start a swing when ready, land it halfway through.
  const interval = workerInterval(world.levels, world.perks)
  w.cd -= dt
  if (w.cd <= 0) {
    w.cd = interval
    w.hitPending = true
  }
  if (w.hitPending && w.cd <= interval * (1 - COMBAT.impactAt)) {
    w.hitPending = false
    world.hit(t, WORKER.damage, w)
  }
}

export function updateWorker(world: WorkerWorld, w: Worker, dt: number) {
  if (w.state === 'down') {
    w.downLeft -= dt
    if (w.downLeft > 0) return
    Object.assign(w, { x: world.coopPad.x, y: world.coopPad.y, hp: WORKER.hp, state: 'idle' })
    return
  }
  for (const pile of world.piles) {
    if (workerBagFree(w, world.levels) <= 0) break
    if (Math.hypot(pile.x - w.x, pile.y - w.y) <= WORKER.pickupRadius) world.takePile(pile, w)
  }
  if (w.state !== 'return' && workerBagFree(w, world.levels) <= 0) {
    release(w)
    w.state = 'return'
  }
  if (w.state === 'return') {
    if (moveTo(w, world.stallPad, dt)) {
      world.sellWorkerBag(w)
      w.state = 'idle'
    }
    return
  }
  if (w.target && !w.target.alive) release(w)
  if (!w.target) {
    const next = findTarget(world, w)
    if (next) {
      next.lockedBy = w
      w.target = next
      w.state = 'work'
      w.idleTo = null
    } else if (w.mango + w.banana > 0) {
      w.state = 'return'
      return
    } else {
      w.state = 'idle'
      return loiter(world, w, dt)
    }
  }
  work(world, w, dt)
}

export function knockDown(w: Worker) {
  release(w)
  w.state = 'down'
  w.downLeft = WORKER.respawnDelay
}

// Empties the worker's bag; returns its sale value at current prices.
export function cashOut(w: Worker, levels: Levels): number {
  const total = w.mango * sellPrice('mango', levels) + w.banana * sellPrice('banana', levels)
  w.mango = 0
  w.banana = 0
  return total
}

// Returns true when this hit knocked the worker down.
export function damageWorker(w: Worker, dmg: number): boolean {
  if (w.state === 'down') return false
  w.hp -= dmg
  if (w.hp > 0) return false
  knockDown(w)
  return true
}
