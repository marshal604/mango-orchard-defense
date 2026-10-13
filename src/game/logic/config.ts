// Numbers mirror docs/reverse-engineering.md. Names follow CONTEXT.md.

export type Difficulty = 'normal' | 'hell'
export type Resource = 'cork' | 'feather'
export type BuildingId = 'stall' | 'clubhouse' | 'proshop' | 'supply'

export const PLAYER = {
  speed: 270,
  pickupRadius: 28,
  reviveInvulnerable: 1.5,
} as const

export const DIFFICULTY = {
  normal: {
    label: '普通',
    hpMax: 170,
    gooseBite: 4 / 3,
    bigGooseBite: 7,
    sightRadius: 160,
    extraBigGeese: 6,
    regen: { mode: 'outOfCombat', delay: 5, perSec: 2 },
    nestSpawnEvery: 8,
    bagBase: 30,
    priceMult: 1,
    workersCanDie: false,
    bigGooseScrape: { dps: 2, sec: 3 },
    king: { hp: 120, bite: 12.48, scrape: { dps: 3, sec: 4 }, sprain: { mult: 0.6, sec: 2.5 } },
  },
  hell: {
    label: '地獄',
    hpMax: 48,
    gooseBite: 16 / 3,
    bigGooseBite: 14,
    sightRadius: 160,
    extraBigGeese: 0,
    regen: { mode: 'safeOnly', delay: 0, perSec: 10 },
    nestSpawnEvery: 2.7,
    bagBase: 15,
    priceMult: 1.5,
    workersCanDie: true,
    bigGooseScrape: { dps: 3, sec: 4 },
    king: { hp: 160, bite: 24.96, scrape: { dps: 4, sec: 5 }, sprain: { mult: 0.5, sec: 3.5 } },
  },
} as const

export interface Racket {
  name: string
  damage: number
  interval: number
  canBigTree: boolean
}

export const RACKETS: readonly Racket[] = [
  { name: '木框拍 I', damage: 1.5, interval: 0.45, canBigTree: false },
  { name: '木框拍 II', damage: 2, interval: 0.4, canBigTree: false },
  { name: '碳纖拍 I', damage: 3, interval: 0.36, canBigTree: true },
  { name: '碳纖拍 II', damage: 4, interval: 0.33, canBigTree: true },
  { name: '發球機 I', damage: 5.5, interval: 0.3, canBigTree: true },
  { name: '發球機 II', damage: 7, interval: 0.27, canBigTree: true },
]

export const COMBAT = {
  ranges: [48, 64, 80],
  needRacketHintEvery: 2,
} as const

export const GOOSE = {
  small: { hp: 4, feathers: 1, speedRatio: 0.6, hitRadius: 12 },
  big: { hp: 9, feathers: 4, speedRatio: 0.7, hitRadius: 18 },
  biteInterval: 0.7,
  baseSpeed: 180,
  biteRange: 28,
  wanderRadius: 90,
  wanderSpeedRatio: 0.5,
  wanderPause: [1, 3],
  leashRadius: 360,
} as const

export const KING = {
  home: { x: 260, y: 3010 },
  hitRadius: 34,
  speedRatio: 0.55,
  sightRadius: 220,
  leashRadius: 560,
  biteInterval: 1.3,
  biteRange: 44,
  regenPerSec: 3,
  feathers: 30,
  clearRadius: 120,
} as const

export const NEST = {
  hp: 13,
  respawnSec: 60,
  reward: 200,
  haste: { mult: 2, sec: 10 },
  hitRadius: 26,
  maxAlive: 6,
  spawnRadius: 50,
} as const

export const TREE = {
  small: { hp: 3, cork: 1, hitRadius: 18 },
  big: { hp: 10, cork: 5, hitRadius: 30 },
} as const

export const ECONOMY = {
  price: { cork: 5, feather: 8 },
  sellIntervals: [0.15, 0.08, 0.04],
  priceBoostPerLevel: 0.4,
  bagPerLevel: 15,
  bagNearFullRatio: 0.85,
  deliveryEvery: 20,
  speedPerShoes: 0.2,
  hpPerArmor: 0.25,
} as const

export const BUILDING = { padRadius: 30, padOffsetY: 40 } as const

export const WORKER = {
  speed: 160,
  damage: 1,
  interval: 0.7,
  toolSpeedPerLevel: 0.3,
  bags: [5, 10, 15],
  range: 36,
  hp: 30,
  respawnDelay: 10,
  pickupRadius: 30,
  idleSpread: 60,
} as const

export const MILESTONES = {
  geeseForDiscount: 60,
  discount: 0.8,
  treesForComplaints: 100,
  complaintsWorkerSlow: 2,
  complaintsDeliveryMult: 1.5,
} as const

export const SHADE = { radius: 44, regenPerSec: 10, freeAfter: 2000 } as const

export const TRAPS = {
  locker: { lockSec: 5, speedMult: 1.5, drainPerSec: 2, effectSec: 10, w: 90, h: 70 },
  drink: { lockSec: 5, radius: 75, abilitySec: 30, molt: { dps: 1, sec: 3 } },
} as const

export const MARATHON = { speed: 110, length: 26 * 30, width: 60, pushGain: 12 } as const

export type Track =
  | 'bag' | 'price' | 'window' | 'delivery'
  | 'ballboy' | 'wrangler' | 'workerTool' | 'cart'
  | 'racket' | 'range' | 'shoes' | 'armor'

export interface UpgradeDef {
  building: BuildingId
  name: string
  prices: readonly number[]
}

export const UPGRADES: Record<Track, UpgradeDef> = {
  bag: { building: 'supply', name: '背包容量', prices: [80, 160, 320] },
  price: { building: 'supply', name: '收購價提升', prices: [120, 240] },
  window: { building: 'supply', name: '加速販賣速度', prices: [200, 400] },
  delivery: { building: 'supply', name: '外送收購', prices: [250] },
  ballboy: { building: 'clubhouse', name: '聘請撿球小弟', prices: [120, 180, 260, 360] },
  wrangler: { building: 'clubhouse', name: '聘請趕鵝員', prices: [150, 220, 320] },
  workerTool: { building: 'clubhouse', name: '工人裝備', prices: [200, 350] },
  cart: { building: 'clubhouse', name: '球車', prices: [300, 450] },
  racket: { building: 'proshop', name: '球拍', prices: [150, 300, 500, 750, 1100] },
  range: { building: 'proshop', name: '揮拍範圍', prices: [150, 300] },
  shoes: { building: 'proshop', name: '球鞋', prices: [100, 200] },
  armor: { building: 'proshop', name: '護具', prices: [180, 300, 450] },
}

export const SUGGEST_ORDER: readonly Track[] = [
  'racket', 'armor', 'bag', 'ballboy', 'wrangler', 'price',
  'range', 'shoes', 'window', 'workerTool', 'cart', 'delivery',
]
