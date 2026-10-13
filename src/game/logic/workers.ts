import { MILESTONES, WORKER } from './config'
import type { Goose, Pile, Tree, Worker } from './entities'
import { gooseStats } from './geese'
import type { Point } from './map'
import type { Levels, Perks } from './run'

// What worker AI needs from the world. Implemented by Game.
export interface WorkerWorld {
  rng: () => number
  trees: readonly Tree[]
  geese: readonly Goose[]
  piles: readonly Pile[]
  levels: Levels
  perks: Perks
  clubPad: Point
  stallPad: Point
  takePile: (pile: Pile, w: Worker) => void
  sellWorkerBag: (w: Worker) => void
  hit: (target: Tree | Goose, damage: number, by: Worker) => void
}

export const workerBagCap = (levels: Levels) => WORKER.bags[levels.cart]
export const workerBagFree = (w: Worker, levels: Levels) => Math.max(0, workerBagCap(levels) - w.cork - w.feather)

export const workerInterval = (levels: Levels, perks: Perks) =>
  (WORKER.interval / (1 + levels.workerTool * WORKER.toolSpeedPerLevel)) *
  (perks.complaints ? MILESTONES.complaintsWorkerSlow : 1)

export function makeWorker(kind: Worker['kind'], at: Point): Worker {
  return {
    kind, x: at.x, y: at.y, hp: WORKER.hp, state: 'idle', target: null,
    cork: 0, feather: 0, cd: 0, downLeft: 0, idleTo: null,
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
}

function findTarget(world: WorkerWorld, w: Worker): Tree | Goose | null {
  const pool: readonly (Tree | Goose)[] = w.kind === 'ballboy'
    ? world.trees.filter((t) => !t.big)
    : world.geese.filter((g) => g.size !== 'king')
  let best: Tree | Goose | null = null
  let bestD = Infinity
  for (const t of pool) {
    if (!t.alive || t.lockedBy) continue
    const d = Math.hypot(t.x - world.clubPad.x, t.y - world.clubPad.y)
    if (d < bestD) { bestD = d; best = t }
  }
  return best
}

function loiter(world: WorkerWorld, w: Worker, dt: number) {
  if (!w.idleTo) {
    const s = WORKER.idleSpread
    w.idleTo = { x: world.clubPad.x + (world.rng() * 2 - 1) * s, y: world.clubPad.y + 10 + world.rng() * (s - 10) }
  }
  moveTo(w, w.idleTo, dt)
}

function work(world: WorkerWorld, w: Worker, dt: number) {
  const t = w.target
  if (!t) return
  const reach = WORKER.range + (t.kind === 'tree' ? t.hitRadius : gooseStats(t).hitRadius)
  if (Math.hypot(t.x - w.x, t.y - w.y) > reach) {
    moveTo(w, t, dt)
    return
  }
  w.cd -= dt
  if (w.cd > 0) return
  w.cd = workerInterval(world.levels, world.perks)
  world.hit(t, WORKER.damage, w)
}

export function updateWorker(world: WorkerWorld, w: Worker, dt: number) {
  if (w.state === 'down') {
    w.downLeft -= dt
    if (w.downLeft > 0) return
    Object.assign(w, { x: world.clubPad.x, y: world.clubPad.y, hp: WORKER.hp, state: 'idle' })
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
    } else if (w.cork + w.feather > 0) {
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
