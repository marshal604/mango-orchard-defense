import type { BuildingId, Track } from '../game/logic/config'
import { ECONOMY, SUGGEST_ORDER, UPGRADES } from '../game/logic/config'
import type { Game } from '../game/logic/game'
import type { Point } from '../game/logic/map'
import { padOf } from '../game/logic/map'

// Tutorial state machine from docs/feel-reference.md section 2: five teaching steps, then "defeat the King".

export interface GuidePanel {
  step: number
  total: number
  title: string
  detail?: string
  tip?: string
  warn?: string
  reminder?: boolean
}

export interface GuideView {
  panel: GuidePanel | null
  target: Point | null
  targetName: string | null
  completed: boolean
  // Upgrade the open building menu should highlight.
  suggest: Track | null
}

interface Step {
  title: string
  done: (g: Game) => boolean
  // Building to walk to and the track to buy there; the arrow only shows once it is affordable.
  buy?: { building: BuildingId; track: Track }
}

const nearFull = (g: Game) => g.run.bagUsed >= g.run.bagCap * ECONOMY.bagNearFullRatio
const building = (g: Game, id: BuildingId) => g.map.buildings.find((b) => b.id === id) ?? g.map.buildings[0]

const STEPS: Step[] = [
  { title: '採芒果、趕猴子，裝滿背包', done: (g) => nearFull(g) || g.run.stats.sold > 0 },
  { title: '回水果攤賣掉', done: (g) => g.run.bagUsed === 0 || (g.run.stats.sold > 0 && g.currentPad() !== 'stall') },
  { title: '到農會請一個採果工', done: (g) => g.run.levels.picker >= 1, buy: { building: 'coop', track: 'picker' } },
  { title: '到農具行升級採果工具', done: (g) => g.run.levels.tool >= 1, buy: { building: 'toolshop', track: 'tool' } },
  { title: '到柑仔店加大背包', done: (g) => g.run.levels.bag >= 1, buy: { building: 'grocery', track: 'bag' } },
]
const TOTAL = STEPS.length + 1

const affordable = (g: Game): Track | null => SUGGEST_ORDER.find((t) => {
  const price = g.run.price(t)
  return price !== null && price <= g.run.money
}) ?? null

function tipFor(g: Game, track: Track | null): string | undefined {
  if (!track) return undefined
  return `可升級：${building(g, UPGRADES[track].building).name}・${UPGRADES[track].name} $${g.run.price(track)}`
}

export class Guide {
  private progress = 0
  private readonly tutorial: boolean

  constructor(tutorial: boolean) {
    this.tutorial = tutorial
    if (!tutorial) this.progress = STEPS.length
  }

  update(g: Game): GuideView {
    const before = this.progress
    while (this.progress < STEPS.length && STEPS[this.progress].done(g)) this.progress++
    const completed = this.progress > before
    const king = { x: g.king.x, y: g.king.y }
    if (!this.tutorial) return { panel: null, target: king, targetName: '猴王', completed, suggest: affordable(g) }

    const stall = building(g, 'stall')
    const reminder = this.progress !== 1 && nearFull(g) && g.currentPad() !== 'stall' && g.king.target !== 'player'
    if (reminder) {
      return {
        panel: { step: this.progress + 1, total: TOTAL, title: '背包快滿了！回水果攤賣掉（或等宅配來收）', reminder: true },
        target: padOf(stall), targetName: stall.name, completed, suggest: null,
      }
    }
    if (this.progress >= STEPS.length) {
      const suggest = affordable(g)
      return {
        panel: {
          step: TOTAL, total: TOTAL, title: '賺錢、升級裝備，打倒猴王',
          detail: '猴王在地圖西南角，跟著金色箭頭走', tip: tipFor(g, suggest),
        },
        target: king, targetName: '猴王', completed, suggest,
      }
    }
    const step = STEPS[this.progress]
    return { ...this.stepView(g, step), completed, suggest: step.buy?.track ?? null }
  }

  private stepView(g: Game, step: Step): Omit<GuideView, 'completed' | 'suggest'> {
    const panel: GuidePanel = { step: this.progress + 1, total: TOTAL, title: step.title }
    if (this.progress === 0) return { panel: { ...panel, detail: `背包 ${g.run.bagUsed}/${g.run.bagCap}` }, target: null, targetName: null }
    if (this.progress === 1) {
      const stall = building(g, 'stall')
      const detail = g.currentPad() === 'stall' ? '站著別動，排隊的客人會一個一個跟你買' : '站上攤位前的圓圈'
      return { panel: { ...panel, detail }, target: padOf(stall), targetName: stall.name }
    }
    const buy = step.buy
    if (!buy) return { panel, target: null, targetName: null }
    const price = g.run.price(buy.track) ?? 0
    if (g.run.money < price) {
      return { panel: { ...panel, detail: `先存到 $${price}（目前 $${g.run.money}）` }, target: null, targetName: null }
    }
    const b = building(g, buy.building)
    return { panel: { ...panel, detail: `買得起了！站上${b.name}前的圓圈` }, target: padOf(b), targetName: b.name }
  }
}
