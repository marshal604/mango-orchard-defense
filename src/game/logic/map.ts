import type { BuildingId } from './config'

export interface Rect { x: number; y: number; w: number; h: number }
export interface Point { x: number; y: number }

export type ZoneId = 'lakeside' | 'wetland' | 'park' | 'arena'

export interface Zone {
  id: ZoneId
  name: string
  stars: string
  rect: Rect
  damageMult: number
  dropMult: number
  counts: { smallTree: number; bigTree: number; goose: number; bigGoose: number; nest: number }
}

export interface Building { id: BuildingId; name: string; x: number; y: number; w: number; h: number }

export interface GameMap {
  width: number
  height: number
  zones: Zone[]
  buildings: Building[]
  shades: Point[]
  lockers: Point[]
  roasts: Point[]
  marathonPath: Point[]
}

const W = 4800
const H = 3200
const HY = 1600
const VX = [1600, 3200]

export const DEFAULT_MAP: GameMap = {
  width: W,
  height: H,
  zones: [
    {
      id: 'lakeside', name: '湖畔', stars: '★★', rect: { x: 0, y: 0, w: W, h: HY },
      damageMult: 2, dropMult: 2,
      counts: { smallTree: 110, bigTree: 45, goose: 24, bigGoose: 20, nest: 3 },
    },
    {
      id: 'wetland', name: '濕地', stars: '★★★', rect: { x: 0, y: HY, w: VX[0], h: H - HY },
      damageMult: 3, dropMult: 3,
      counts: { smallTree: 40, bigTree: 30, goose: 60, bigGoose: 16, nest: 5 },
    },
    {
      id: 'park', name: '中央運動公園', stars: '★', rect: { x: VX[0], y: HY, w: VX[1] - VX[0], h: H - HY },
      damageMult: 1, dropMult: 1,
      counts: { smallTree: 70, bigTree: 12, goose: 7, bigGoose: 0, nest: 1 },
    },
    {
      id: 'arena', name: '球館區', stars: '★☆', rect: { x: VX[1], y: HY, w: W - VX[1], h: H - HY },
      damageMult: 1.5, dropMult: 1.5,
      counts: { smallTree: 45, bigTree: 18, goose: 13, bigGoose: 7, nest: 2 },
    },
  ],
  buildings: [
    { id: 'stall', name: '羽球工坊收購攤', x: 2400, y: 2350, w: 220, h: 160 },
    { id: 'clubhouse', name: '球友會館', x: 2000, y: 2750, w: 220, h: 160 },
    { id: 'proshop', name: '球拍專賣店', x: 2400, y: 1150, w: 220, h: 160 },
    { id: 'supply', name: '補給站', x: 4000, y: 2400, w: 220, h: 160 },
  ],
  shades: [{ x: 1300, y: 2200 }, { x: 900, y: 2700 }, { x: 3000, y: 900 }, { x: 3700, y: 2900 }],
  lockers: [{ x: 1800, y: 1900 }, { x: 3500, y: 2000 }],
  roasts: [{ x: 1100, y: 1000 }],
  marathonPath: [{ x: 300, y: 1600 }, { x: 4500, y: 1600 }],
}

export const inRect = (p: Point, r: Rect, pad = 0): boolean =>
  p.x > r.x - pad && p.x < r.x + r.w + pad && p.y > r.y - pad && p.y < r.y + r.h + pad

export function zoneAt(map: GameMap, p: Point): Zone {
  return map.zones.find((z) => p.x >= z.rect.x && p.x < z.rect.x + z.rect.w && p.y >= z.rect.y && p.y < z.rect.y + z.rect.h)
    ?? map.zones.find((z) => z.id === 'park')
    ?? map.zones[0]
}

// Area around each building where enemies cannot hurt the player: from its middle to 110 px below it.
export const safeArea = (b: Building): Rect => ({
  x: b.x - b.w / 2 - 50,
  y: b.y,
  w: b.w + 100,
  h: b.h / 2 + 110,
})

export const inSafeArea = (map: GameMap, p: Point, pad = 0): boolean =>
  map.buildings.some((b) => inRect(p, safeArea(b), pad))

export const padOf = (b: Building): Point => ({ x: b.x, y: b.y + b.h / 2 + 40 })

export const spawnPoint = (map: GameMap): Point => {
  const stall = map.buildings.find((b) => b.id === 'stall') ?? map.buildings[0]
  return { x: stall.x + 110, y: stall.y + 50 }
}

export const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)
