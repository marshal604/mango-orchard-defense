import type { Resource } from './config'
import type { Pile, Worker } from './entities'
import type { Point } from './map'
import type { Levels } from './run'
import { workerBagFree } from './workers'
import { newId } from './world'

// Puts up to `amount` into a bag and returns what did not fit.
export type Stash = (kind: Resource, amount: number) => number

export const workerStash = (w: Worker, levels: Levels): Stash => (kind, amount) => {
  const n = Math.min(amount, workerBagFree(w, levels))
  w[kind] += n
  return amount - n
}

export function newPile(kind: Resource, amount: number, at: Point): Pile {
  const pile: Pile = { id: newId(), x: at.x, y: at.y, cork: 0, feather: 0 }
  pile[kind] = amount
  return pile
}

// Feathers first, like selling, so the more valuable item is never left behind.
export function takeFromPile(pile: Pile, stash: Stash): void {
  pile.feather = stash('feather', pile.feather)
  pile.cork = stash('cork', pile.cork)
}

export const nonEmpty = (piles: readonly Pile[]) => piles.filter((p) => p.cork + p.feather > 0)
