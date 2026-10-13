import type { Difficulty, Track } from '../game/logic/config'
import { ECONOMY, MILESTONES, TOOLS, WORKER } from '../game/logic/config'
import type { Levels, Perks } from '../game/logic/run'
import { attackRange, bagCap, hpMaxOf, maxLevel, sellInterval, sellPrice } from '../game/logic/run'

// Human-readable "current -> next" line for an upgrade track.
export function upgradeDesc(t: Track, levels: Levels, d: Difficulty, perks: Perks): string {
  const lv = levels[t]
  const next = { ...levels, [t]: lv + 1 }
  const maxed = lv >= maxLevel(t)
  const arrow = (a: string | number, b: string | number) => (maxed ? `${a}` : `${a} → ${b}`)
  switch (t) {
    case 'bag': return `一次背 ${arrow(bagCap(levels, d), bagCap(next, d))} 個`
    case 'price': return `芒果 $${arrow(sellPrice('mango', levels), sellPrice('mango', next))}、香蕉 $${arrow(sellPrice('banana', levels), sellPrice('banana', next))}`
    case 'window': return maxed ? '客人買得超快' : `每 ${sellInterval(levels)} 秒 → ${sellInterval(next)} 秒賣一個`
    case 'delivery': return `宅配每 ${ECONOMY.deliveryEvery * (perks.overwork ? MILESTONES.overworkDeliveryMult : 1)} 秒到你身邊收走整包水果`
    case 'picker': return maxed ? `採果工 ${lv} 人（已滿）` : `採果工 ${lv} → ${lv + 1} 人，自動採收小果樹`
    case 'ranger': return maxed ? `驅猴員 ${lv} 人（已滿）` : `驅猴員 ${lv} → ${lv + 1} 人，自動趕猴子`
    case 'workerTool': return maxed ? '工人速度已最快' : '工人工作速度 +30%'
    case 'cart': return `工人一次背 ${arrow(WORKER.bags[levels.cart], WORKER.bags[next.cart])} 個`
    case 'tool': {
      const a = TOOLS[lv]
      if (maxed) return `${a.name}：傷害 ${a.damage}，每 ${a.interval} 秒`
      const b = TOOLS[lv + 1]
      return `${a.name} → ${b.name}（傷害 ${a.damage} → ${b.damage}、每 ${b.interval} 秒${b.canBigTree && !a.canBigTree ? '，搆得到老欉芒果樹' : ''}）`
    }
    case 'range': return `揮竿範圍 ${arrow(attackRange(levels), attackRange(next))}`
    case 'shoes': return maxed ? '移動速度已最快' : '移動速度 +20%'
    case 'armor': return `血量上限 ${arrow(hpMaxOf(levels, d), hpMaxOf(next, d))}`
  }
}
