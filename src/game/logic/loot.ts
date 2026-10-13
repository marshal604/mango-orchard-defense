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
  const pile: Pile = { id: newId(), x: at.x, y: at.y, mango: 0, banana: 0 }
  pile[kind] = amount
  return pile
}

// Bananas first, like selling, so the more valuable item is never left behind.
export function takeFromPile(pile: Pile, stash: Stash): void {
  pile.banana = stash('banana', pile.banana)
  pile.mango = stash('mango', pile.mango)
}

export const nonEmpty = (piles: readonly Pile[]) => piles.filter((p) => p.mango + p.banana > 0)
