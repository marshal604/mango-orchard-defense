import type { Resource } from './config'
import { ECONOMY, MILESTONES } from './config'
import type { Notice } from './events'
import { complaintsNotice, discountNotice } from './messages'
import type { RunState } from './run'
import { sellInterval } from './run'

export interface EconomyClock { sellCd: number; deliveryCd: number }

// Queued customers buy one item per sell interval while the player stands on the stall pad.
export function sellAtStall(run: RunState, clock: EconomyClock, dt: number, onStall: boolean): Resource[] {
  if (!onStall) {
    clock.sellCd = 0
    return []
  }
  const sold: Resource[] = []
  clock.sellCd -= dt
  while (clock.sellCd <= 0 && run.bagUsed > 0) {
    const kind = run.sellOne()
    if (!kind) break
    clock.sellCd += sellInterval(run.levels)
    sold.push(kind)
  }
  if (clock.sellCd < 0) clock.sellCd = 0
  return sold
}

// Returns the amount the rider sold, or null when no delivery happened this step.
export function tickDelivery(run: RunState, clock: EconomyClock, dt: number): number | null {
  if (run.levels.delivery <= 0 || run.dead) return null
  clock.deliveryCd += dt
  const every = ECONOMY.deliveryEvery * (run.perks.complaints ? MILESTONES.complaintsDeliveryMult : 1)
  if (clock.deliveryCd < every) return null
  clock.deliveryCd = 0
  if (run.bagUsed <= 0) return null
  return run.sellAll()
}

// Unlocks milestone perks once their thresholds are crossed; returns the notices to show.
export function reachMilestones(run: RunState): Notice[] {
  const out: Notice[] = []
  if (!run.perks.discount && run.stats.geese >= MILESTONES.geeseForDiscount) {
    run.perks = { ...run.perks, discount: true }
    out.push(discountNotice)
  }
  if (!run.perks.complaints && run.stats.trees >= MILESTONES.treesForComplaints) {
    run.perks = { ...run.perks, complaints: true }
    out.push(complaintsNotice)
  }
  return out
}
