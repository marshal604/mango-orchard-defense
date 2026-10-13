import type { Point, Zone } from './map'

export type MonkeySize = 'small' | 'big' | 'king'

export interface Worker {
  kind: 'picker' | 'ranger'
  x: number
  y: number
  hp: number
  state: 'idle' | 'work' | 'return' | 'down'
  target: Tree | Monkey | null
  mango: number
  banana: number
  cd: number
  hitPending: boolean
  downLeft: number
  idleTo: Point | null
}

export type Attacker = 'player' | Worker

export interface Tree {
  kind: 'tree'
  id: number
  x: number
  y: number
  big: boolean
  hp: number
  hitRadius: number
  alive: boolean
  zone: Zone
  lockedBy: Worker | null
}

export interface Monkey {
  kind: 'monkey'
  id: number
  x: number
  y: number
  size: MonkeySize
  hp: number
  hpMax: number
  alive: boolean
  zone: Zone
  home: Point
  state: 'wander' | 'chase' | 'return'
  target: Attacker | null
  wanderTo: Point | null
  pauseLeft: number
  biteCd: number
  spicyLeft: number
  den: Den | null
  lockedBy: Worker | null
  facingRight: boolean
  biting: boolean
}

export interface Den {
  kind: 'den'
  id: number
  x: number
  y: number
  hp: number
  alive: boolean
  zone: Zone
  children: number
  spawnCd: number
  respawnLeft: number
}

export interface Pile { id: number; x: number; y: number; mango: number; banana: number }

export type Target = Tree | Monkey | Den
