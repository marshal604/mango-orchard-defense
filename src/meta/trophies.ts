import { MILESTONES, TOOLS } from '../game/logic/config'
import type { Game } from '../game/logic/game'

export type Tier = 'bronze' | 'silver' | 'gold'

export interface Trophy {
  id: string
  tier: Tier
  name: string
  desc: string
  earned: (g: Game) => boolean
}

const SPEEDRUN_SEC = 300
const DEN_BUSTER = 5

// Stage-1 trophy set from docs/feel-reference.md, re-themed. A card pauses the run when one is earned.
export const TROPHIES: readonly Trophy[] = [
  { id: 'first_tree', tier: 'bronze', name: '第一顆芒果', desc: '採收第一棵果樹', earned: (g) => g.run.stats.trees >= 1 },
  { id: 'first_monkey', tier: 'bronze', name: '趕跑小偷', desc: '趕走第一隻猴子', earned: (g) => g.run.stats.monkeys >= 1 },
  { id: 'first_sale', tier: 'bronze', name: '開張大吉', desc: '在水果攤賣出第一顆水果', earned: (g) => g.run.stats.sold >= 1 },
  { id: 'first_upgrade', tier: 'bronze', name: '工欲善其事', desc: '第一次升級採果工具', earned: (g) => g.run.levels.tool >= 1 },
  { id: 'first_worker', tier: 'bronze', name: '請到幫手', desc: '請第一位工人', earned: (g) => g.workers.length >= 1 },
  { id: 'first_den', tier: 'bronze', name: '端掉據點', desc: '拆掉第一個猴群據點', earned: (g) => g.run.stats.dens >= 1 },
  { id: 'all_zones', tier: 'bronze', name: '走遍果園', desc: '一場內走過四個區域', earned: (g) => g.visitedZones.size >= g.map.zones.length },
  { id: 'first_down', tier: 'bronze', name: '被猴子圍攻', desc: '第一次倒下', earned: (g) => g.run.stats.deaths >= 1 },
  { id: 'shears', tier: 'silver', name: '搆得到了', desc: '買到高枝剪', earned: (g) => (TOOLS[g.run.levels.tool]?.canBigTree ?? false) },
  { id: 'ranger_award', tier: 'silver', name: '驅猴有功', desc: `趕走 ${MILESTONES.monkeysForDiscount} 隻猴子`, earned: (g) => g.run.perks.discount },
  { id: 'overwork', tier: 'silver', name: '工人過勞', desc: `採收 ${MILESTONES.treesForOverwork} 棵果樹`, earned: (g) => g.run.perks.overwork },
  { id: 'den_buster', tier: 'silver', name: '據點剋星', desc: `一場拆掉 ${DEN_BUSTER} 個猴群據點`, earned: (g) => g.run.stats.dens >= DEN_BUSTER },
  { id: 'king_normal', tier: 'silver', name: '猴王退散', desc: '在普通難度打倒猴王', earned: (g) => g.finished && g.difficulty === 'normal' },
  { id: 'max_tool', tier: 'gold', name: '採果機器人', desc: '採果工具升到滿級', earned: (g) => g.run.levels.tool >= TOOLS.length - 1 },
  { id: 'no_death', tier: 'gold', name: '毫髮無傷', desc: '一次都沒倒下就打倒猴王', earned: (g) => g.finished && g.run.stats.deaths === 0 },
  { id: 'speedrun', tier: 'gold', name: '神速果農', desc: `普通難度 ${SPEEDRUN_SEC / 60} 分鐘內打倒猴王`, earned: (g) => g.finished && g.difficulty === 'normal' && g.elapsed <= SPEEDRUN_SEC },
  { id: 'king_hell', tier: 'gold', name: '地獄猴王', desc: '在地獄難度打倒猴王', earned: (g) => g.finished && g.difficulty === 'hell' },
]

type Store = Pick<Storage, 'getItem' | 'setItem'>
const KEY = 'st_trophies'

function load(store: Store): Set<string> {
  try {
    const v: unknown = JSON.parse(store.getItem(KEY) ?? '[]')
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    // Corrupted storage: start a fresh shelf instead of breaking the run.
    return new Set()
  }
}

export class TrophyTracker {
  private readonly store: Store
  readonly owned: Set<string>

  constructor(store: Store) {
    this.store = store
    this.owned = load(store)
  }

  // Returns trophies newly earned since the last check and saves them.
  check(g: Game): Trophy[] {
    const fresh = TROPHIES.filter((t) => !this.owned.has(t.id) && t.earned(g))
    if (fresh.length === 0) return []
    for (const t of fresh) this.owned.add(t.id)
    try {
      this.store.setItem(KEY, JSON.stringify([...this.owned]))
    } catch {
      // Storage blocked: trophies still show this run, they are just not remembered.
    }
    return fresh
  }
}
